{{/*
Expand the name of the chart.
*/}}
{{- define "dits.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "dits.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "dits.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "dits.labels" -}}
helm.sh/chart: {{ include "dits.chart" . }}
{{ include "dits.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "dits.selectorLabels" -}}
app.kubernetes.io/name: {{ include "dits.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "dits.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "dits.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Database URL
*/}}
{{- define "dits.databaseUrl" -}}
{{- if .Values.database.external.enabled }}
{{- printf "postgres://$(DB_USER):$(DB_PASSWORD)@%s:%d/%s" .Values.database.external.host (int .Values.database.external.port) .Values.database.external.database }}
{{- else }}
{{- printf "postgres://$(DB_USER):$(DB_PASSWORD)@%s-postgresql:5432/%s" .Release.Name "dits" }}
{{- end }}
{{- end }}

{{/*
Redis URL
*/}}
{{- define "dits.redisUrl" -}}
{{- if .Values.cache.external.enabled }}
{{- printf "redis://%s:%d" .Values.cache.external.host (int .Values.cache.external.port) }}
{{- else }}
{{- printf "redis://%s-redis-master:6379" .Release.Name }}
{{- end }}
{{- end }}
