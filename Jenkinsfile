pipeline {
    agent any

    options {
        timeout(time: 45, unit: 'MINUTES')
    }

    parameters {
        string(name: 'BASE_URL', defaultValue: 'http://host.docker.internal:3000', description: 'Base URL da API alvo para os testes k6')
        booleanParam(name: 'RUN_LOAD', defaultValue: true, description: 'Executar load test')
        booleanParam(name: 'RUN_STRESS', defaultValue: true, description: 'Executar stress test')
        string(name: 'VUS', defaultValue: '20', description: 'VUs para cenário load (override)')
        string(name: 'DURATION', defaultValue: '1m', description: 'Duração para cenário load (override)')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Prepare Workspace') {
            steps {
                bat '''
                if exist results rmdir /s /q results
                if exist allure-results rmdir /s /q allure-results
                if exist allure-report rmdir /s /q allure-report
                if not exist results mkdir results
                '''
            }
        }

        stage('Validate Docker') {
            steps {
                bat '''
                docker version >nul 2>&1
                if errorlevel 1 (
                    echo Docker nao esta disponivel no agente Jenkins.
                    echo Instale/ligue o Docker ou adapte o Jenkinsfile para usar k6 local.
                    exit /b 1
                )
                '''
            }
        }

        stage('Smoke') {
            steps {
                bat '''
                docker run --rm -i ^
                  -v "%CD%:/work" ^
                  -w /work ^
                  -e BASE_URL=%BASE_URL% ^
                  grafana/k6 run tests/smoke.js --summary-export=results/smoke-summary.json
                '''
            }
        }

        stage('Load') {
            when {
                expression { return params.RUN_LOAD }
            }
            steps {
                bat '''
                docker run --rm -i ^
                  -v "%CD%:/work" ^
                  -w /work ^
                  -e BASE_URL=%BASE_URL% ^
                  -e VUS=%VUS% ^
                  -e DURATION=%DURATION% ^
                  grafana/k6 run tests/load.js --summary-export=results/load-summary.json
                '''
            }
        }

        stage('Stress') {
            when {
                expression { return params.RUN_STRESS }
            }
            steps {
                bat '''
                docker run --rm -i ^
                  -v "%CD%:/work" ^
                  -w /work ^
                  -e BASE_URL=%BASE_URL% ^
                  grafana/k6 run tests/stress.js --summary-export=results/stress-summary.json
                '''
            }
        }
    }

    post {
        always {
            script {
                def allureStatus = bat(
                    returnStatus: true,
                    script: '''
                    node scripts/k6-summary-to-allure.js --inputDir results --outputDir allure-results

                    if not exist "allure-results\\*-result.json" (
                        echo Nenhum arquivo de resultado Allure foi gerado.
                        exit /b 0
                    )

                    npx --yes allure-commandline@2.34.1 generate allure-results --clean -o allure-report --single-file
                    if errorlevel 1 (
                        echo Falha ao gerar allure-report via CLI. Arquivos allure-results serao arquivados mesmo assim.
                        exit /b 0
                    )

                    if not exist "allure-report\\index.html" (
                        echo allure-report gerado sem index.html. Verifique versao do Allure CLI.
                        exit /b 0
                    )
                    '''
                )

                if (allureStatus != 0) {
                    echo 'Aviso: etapa de geracao do Allure retornou erro.'
                }
            }
            archiveArtifacts artifacts: 'results/*.json', allowEmptyArchive: true
            archiveArtifacts artifacts: 'allure-results/**', allowEmptyArchive: true
            archiveArtifacts artifacts: 'allure-report/**', allowEmptyArchive: true
        }
        success {
            echo 'Pipeline k6 finalizada com sucesso.'
        }
        failure {
            echo 'Pipeline k6 falhou. Verifique thresholds e conectividade com a API.'
        }
    }
}
