import { Metadata } from "next";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cloud, CheckCircle, Shield, Zap } from "lucide-react";

export const metadata: Metadata = {
    title: "Kubernetes Deployment",
    description: "Deploy Dits on Kubernetes for scalable, production-grade infrastructure",
};

export default function KubernetesPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1>Kubernetes Deployment</h1>
            <p className="lead text-xl text-muted-foreground">
                Deploy Dits on Kubernetes for enterprise-grade scalability, high availability,
                and automated operations.
            </p>

            <Alert className="not-prose my-6">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Production Ready</AlertTitle>
                <AlertDescription>
                    Kubernetes deployment includes auto-scaling, rolling updates, and self-healing.
                </AlertDescription>
            </Alert>

            <h2>Prerequisites</h2>

            <ul>
                <li>Kubernetes cluster 1.24+</li>
                <li>kubectl configured</li>
                <li>Helm 3.x (optional but recommended)</li>
                <li>Persistent storage provisioner</li>
            </ul>

            <h2>Helm Installation</h2>

            <h3>Add the Dits Helm Repository</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`# Add repository
helm repo add dits https://charts.dits.io
helm repo update

# Install with default values
helm install dits dits/dits-server

# Or customize with values file
helm install dits dits/dits-server -f values.yaml`}</code></pre>

            <h3>Example values.yaml</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`replicaCount: 3

image:
  repository: dits/dits-server
  tag: latest
  pullPolicy: IfNotPresent

resources:
  limits:
    cpu: 2000m
    memory: 4Gi
  requests:
    cpu: 500m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

postgresql:
  enabled: true
  auth:
    postgresPassword: changeme
    database: dits

redis:
  enabled: true
  auth:
    enabled: false

persistence:
  enabled: true
  size: 100Gi
  storageClass: standard

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: dits.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: dits-tls
      hosts:
        - dits.example.com`}</code></pre>

            <h2>Manual Kubernetes Manifests</h2>

            <Tabs defaultValue="deployment" className="not-prose my-8">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="deployment">Deployment</TabsTrigger>
                    <TabsTrigger value="service">Service</TabsTrigger>
                    <TabsTrigger value="configmap">ConfigMap</TabsTrigger>
                    <TabsTrigger value="ingress">Ingress</TabsTrigger>
                </TabsList>

                <TabsContent value="deployment" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>deployment.yaml</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`apiVersion: apps/v1
kind: Deployment
metadata:
  name: dits-server
  labels:
    app: dits
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dits
  template:
    metadata:
      labels:
        app: dits
    spec:
      containers:
      - name: dits
        image: dits/dits-server:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: dits-secrets
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: dits-secrets
              key: jwt-secret
        resources:
          limits:
            cpu: "2"
            memory: 4Gi
          requests:
            cpu: "500m"
            memory: 1Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: dits-data`}</code></pre>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="service" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>service.yaml</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`apiVersion: v1
kind: Service
metadata:
  name: dits-server
  labels:
    app: dits
spec:
  type: ClusterIP
  ports:
  - port: 8080
    targetPort: 8080
    protocol: TCP
    name: http
  selector:
    app: dits`}</code></pre>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="configmap" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>configmap.yaml</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`apiVersion: v1
kind: ConfigMap
metadata:
  name: dits-config
data:
  LOG_LEVEL: "info"
  STORAGE_TYPE: "local"
  STORAGE_PATH: "/data/chunks"
  METRICS_ENABLED: "true"
  CACHE_SIZE: "2GB"`}</code></pre>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="ingress" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>ingress.yaml</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dits-ingress
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - dits.example.com
    secretName: dits-tls
  rules:
  - host: dits.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dits-server
            port:
              number: 8080`}</code></pre>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <h2>Scaling</h2>

            <div className="grid gap-6 md:grid-cols-2 my-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary" />
                            Horizontal Pod Autoscaler
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dits-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dits-server
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70`}</code></pre>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            Pod Disruption Budget
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: dits-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: dits`}</code></pre>
                    </CardContent>
                </Card>
            </div>

            <h2>Monitoring</h2>

            <p>Dits exposes Prometheus metrics at <code>/metrics</code>. Configure a ServiceMonitor for automatic scraping:</p>

            <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dits-monitor
spec:
  selector:
    matchLabels:
      app: dits
  endpoints:
  - port: http
    path: /metrics
    interval: 30s`}</code></pre>

            <Alert className="not-prose my-6">
                <Cloud className="h-4 w-4" />
                <AlertTitle>Cloud Provider Integration</AlertTitle>
                <AlertDescription>
                    For managed Kubernetes services (GKE, EKS, AKS), see our cloud-specific
                    deployment guides for optimized configurations.
                </AlertDescription>
            </Alert>
        </div>
    );
}
