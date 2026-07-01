const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getArg(name, defaultValue) {
  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }

  return defaultValue;
}

function toTitleCase(text) {
  return text
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function extractFailedThresholds(metrics) {
  const failed = [];

  for (const [metricName, metricData] of Object.entries(metrics || {})) {
    const thresholds = metricData && metricData.thresholds ? metricData.thresholds : {};

    for (const [thresholdName, thresholdStatus] of Object.entries(thresholds)) {
      const isPassed =
        typeof thresholdStatus === 'boolean'
          ? thresholdStatus
          : thresholdStatus && typeof thresholdStatus.ok === 'boolean'
            ? thresholdStatus.ok
            : true;

      if (!isPassed) {
        failed.push(`${metricName}: ${thresholdName}`);
      }
    }
  }

  return failed;
}

function formatMetricLine(name, metric) {
  const values = metric && metric.values ? metric.values : {};
  const parts = [];

  if (values.rate !== undefined) {
    parts.push(`rate=${values.rate}`);
  }
  if (values.avg !== undefined) {
    parts.push(`avg=${values.avg}`);
  }
  if (values.min !== undefined) {
    parts.push(`min=${values.min}`);
  }
  if (values.max !== undefined) {
    parts.push(`max=${values.max}`);
  }
  if (values.p95 !== undefined) {
    parts.push(`p95=${values.p95}`);
  }
  if (values.count !== undefined) {
    parts.push(`count=${values.count}`);
  }

  if (!parts.length) {
    return null;
  }

  return `${name}: ${parts.join(', ')}`;
}

function buildMetricsSummary(metrics) {
  const preferredOrder = [
    'checks',
    'http_req_failed',
    'http_req_duration',
    'http_reqs',
    'iterations',
    'vus',
    'vus_max',
    'data_received',
    'data_sent',
  ];

  const lines = [];

  for (const metricName of preferredOrder) {
    if (!metrics[metricName]) {
      continue;
    }

    const line = formatMetricLine(metricName, metrics[metricName]);
    if (line) {
      lines.push(line);
    }
  }

  for (const [metricName, metricData] of Object.entries(metrics)) {
    if (preferredOrder.includes(metricName)) {
      continue;
    }

    const line = formatMetricLine(metricName, metricData);
    if (line) {
      lines.push(line);
    }
  }

  return lines.join('\n');
}

function writeEnvironmentFile(outputDir) {
  const envLines = [];
  const envKeys = ['BASE_URL', 'VUS', 'DURATION'];

  for (const key of envKeys) {
    if (process.env[key]) {
      envLines.push(`${key}=${process.env[key]}`);
    }
  }

  if (!envLines.length) {
    return;
  }

  fs.writeFileSync(path.join(outputDir, 'environment.properties'), `${envLines.join('\n')}\n`, 'utf8');
}

function writeExecutorFile(outputDir) {
  const executor = {
    name: 'Jenkins',
    type: 'jenkins',
    buildName: process.env.JOB_NAME || 'k6-performance-tests',
    buildUrl: process.env.BUILD_URL || '',
    buildOrder: process.env.BUILD_NUMBER || '',
    reportName: 'k6 performance report',
  };

  fs.writeFileSync(path.join(outputDir, 'executor.json'), JSON.stringify(executor, null, 2), 'utf8');
}

function main() {
  const inputDir = path.resolve(getArg('--inputDir', 'results'));
  const outputDir = path.resolve(getArg('--outputDir', 'allure-results'));

  if (!fs.existsSync(inputDir)) {
    console.log(`[allure] Input directory not found: ${inputDir}`);
    process.exit(0);
  }

  const summaryFiles = fs
    .readdirSync(inputDir)
    .filter((fileName) => fileName.toLowerCase().endsWith('.json'))
    .map((fileName) => path.join(inputDir, fileName));

  if (!summaryFiles.length) {
    console.log('[allure] No k6 summary JSON files found.');
    process.exit(0);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  writeEnvironmentFile(outputDir);
  writeExecutorFile(outputDir);

  const now = Date.now();
  let generated = 0;

  for (const summaryPath of summaryFiles) {
    let summary;

    try {
      summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    } catch (error) {
      console.log(`[allure] Skipping invalid JSON: ${path.basename(summaryPath)} (${error.message})`);
      continue;
    }

    const baseName = path.basename(summaryPath).replace(/-summary\.json$/i, '').replace(/\.json$/i, '');
    const testName = toTitleCase(baseName);
    const failedThresholds = extractFailedThresholds(summary.metrics || {});
    const status = failedThresholds.length ? 'failed' : 'passed';
    const uuid = crypto.randomUUID();

    const metricsSummary = buildMetricsSummary(summary.metrics || {});
    const metricsAttachmentName = `${uuid}-metrics.txt`;
    fs.writeFileSync(path.join(outputDir, metricsAttachmentName), `${metricsSummary}\n`, 'utf8');

    const rawSummaryAttachmentName = `${uuid}-raw-summary.json`;
    fs.writeFileSync(path.join(outputDir, rawSummaryAttachmentName), JSON.stringify(summary, null, 2), 'utf8');

    const result = {
      uuid,
      historyId: crypto.createHash('md5').update(`k6:${baseName}`).digest('hex'),
      testCaseId: crypto.createHash('md5').update(`k6:${baseName}`).digest('hex'),
      name: `k6 ${testName}`,
      fullName: `k6.${baseName}`,
      status,
      stage: 'finished',
      statusDetails: {
        message: failedThresholds.length
          ? `Thresholds failing: ${failedThresholds.join('; ')}`
          : 'All thresholds passed',
      },
      labels: [
        { name: 'framework', value: 'k6' },
        { name: 'language', value: 'javascript' },
        { name: 'suite', value: 'Performance Tests' },
        { name: 'parentSuite', value: 'ecommerce-k6-tests' },
        { name: 'host', value: process.env.NODE_NAME || 'local' },
      ],
      links: [],
      steps: [],
      attachments: [
        {
          name: 'k6 metrics summary',
          source: metricsAttachmentName,
          type: 'text/plain',
        },
        {
          name: 'k6 raw summary',
          source: rawSummaryAttachmentName,
          type: 'application/json',
        },
      ],
      parameters: [
        { name: 'BASE_URL', value: process.env.BASE_URL || '' },
        { name: 'VUS', value: process.env.VUS || '' },
        { name: 'DURATION', value: process.env.DURATION || '' },
      ],
      start: now,
      stop: now + 1,
    };

    fs.writeFileSync(path.join(outputDir, `${uuid}-result.json`), JSON.stringify(result, null, 2), 'utf8');
    generated += 1;
  }

  console.log(`[allure] Generated ${generated} Allure result file(s) in ${outputDir}`);
}

main();
