pipeline {
    agent any

    options {
        timeout(time: 45, unit: 'MINUTES')
        timestamps()
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
            archiveArtifacts artifacts: 'results/*.json', allowEmptyArchive: true
        }
        success {
            echo 'Pipeline k6 finalizada com sucesso.'
        }
        failure {
            echo 'Pipeline k6 falhou. Verifique thresholds e conectividade com a API.'
        }
    }
}
