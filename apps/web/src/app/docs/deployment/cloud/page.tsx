import { Metadata } from "next";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cloud, CheckCircle, Zap, Shield } from "lucide-react";

export const metadata: Metadata = {
    title: "Cloud Provider Deployment",
    description: "Deploy Dits on AWS, Google Cloud, Azure, and other cloud providers",
};

export default function CloudPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1>Cloud Provider Deployment</h1>
            <p className="lead text-xl text-muted-foreground">
                Deploy Dits on major cloud providers with managed services for
                databases, storage, and Kubernetes.
            </p>

            <Alert className="not-prose my-6">
                <Cloud className="h-4 w-4" />
                <AlertTitle>Cloud Native</AlertTitle>
                <AlertDescription>
                    Dits integrates seamlessly with cloud-native services for optimal
                    performance and reliability.
                </AlertDescription>
            </Alert>

            <h2>Supported Cloud Providers</h2>

            <div className="grid gap-6 md:grid-cols-3 my-8">
                <Card className="border-primary/30">
                    <CardHeader>
                        <CardTitle>Amazon Web Services</CardTitle>
                        <CardDescription>
                            Full integration with AWS services
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>EKS for Kubernetes</li>
                            <li>RDS for PostgreSQL</li>
                            <li>S3 for chunk storage</li>
                            <li>ElastiCache for Redis</li>
                            <li>CloudFront CDN</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Google Cloud</CardTitle>
                        <CardDescription>
                            Native GCP integration
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>GKE for Kubernetes</li>
                            <li>Cloud SQL for PostgreSQL</li>
                            <li>Cloud Storage for chunks</li>
                            <li>Memorystore for Redis</li>
                            <li>Cloud CDN</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Microsoft Azure</CardTitle>
                        <CardDescription>
                            Enterprise Azure integration
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>AKS for Kubernetes</li>
                            <li>Azure Database for PostgreSQL</li>
                            <li>Blob Storage for chunks</li>
                            <li>Azure Cache for Redis</li>
                            <li>Azure CDN</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <h2>Deployment Guides</h2>

            <Tabs defaultValue="aws" className="not-prose my-8">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="aws">AWS</TabsTrigger>
                    <TabsTrigger value="gcp">Google Cloud</TabsTrigger>
                    <TabsTrigger value="azure">Azure</TabsTrigger>
                </TabsList>

                <TabsContent value="aws" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>AWS Deployment</CardTitle>
                            <CardDescription>
                                Deploy on Amazon EKS with managed services
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-medium mb-2">1. Create EKS Cluster</h4>
                                <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`# Using eksctl
eksctl create cluster \\
  --name dits-cluster \\
  --region us-east-1 \\
  --nodegroup-name workers \\
  --node-type m5.large \\
  --nodes 3 \\
  --nodes-min 2 \\
  --nodes-max 10`}</code></pre>
                            </div>

                            <div>
                                <h4 className="font-medium mb-2">2. Configure S3 Storage</h4>
                                <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`# Create S3 bucket
aws s3 mb s3://dits-chunks-bucket --region us-east-1

# Create IAM policy for S3 access
aws iam create-policy --policy-name DitsS3Access \\
  --policy-document file://s3-policy.json`}</code></pre>
                            </div>

                            <div>
                                <h4 className="font-medium mb-2">3. Deploy Dits</h4>
                                <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`# Add Helm repo and install
helm repo add dits https://charts.dits.io
helm install dits dits/dits-server \\
  --set storage.type=s3 \\
  --set storage.bucket=dits-chunks-bucket \\
  --set storage.region=us-east-1`}</code></pre>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="gcp" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Google Cloud Deployment</CardTitle>
                            <CardDescription>
                                Deploy on GKE with Cloud SQL and Cloud Storage
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-medium mb-2">1. Create GKE Cluster</h4>
                                <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`# Create GKE cluster
gcloud container clusters create dits-cluster \\
  --zone us-central1-a \\
  --num-nodes 3 \\
  --machine-type e2-standard-4 \\
  --enable-autoscaling \\
  --min-nodes 2 \\
  --max-nodes 10`}</code></pre>
                            </div>

                            <div>
                                <h4 className="font-medium mb-2">2. Set Up Cloud SQL</h4>
                                <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`# Create Cloud SQL instance
gcloud sql instances create dits-db \\
  --database-version=POSTGRES_15 \\
  --tier=db-standard-2 \\
  --region=us-central1`}</code></pre>
                            </div>

                            <div>
                                <h4 className="font-medium mb-2">3. Configure Workload Identity</h4>
                                <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`# Enable workload identity
gcloud container clusters update dits-cluster \\
  --zone us-central1-a \\
  --workload-pool=PROJECT_ID.svc.id.goog`}</code></pre>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="azure" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Azure Deployment</CardTitle>
                            <CardDescription>
                                Deploy on AKS with Azure services
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-medium mb-2">1. Create AKS Cluster</h4>
                                <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`# Create resource group
az group create --name dits-rg --location eastus

# Create AKS cluster
az aks create \\
  --resource-group dits-rg \\
  --name dits-cluster \\
  --node-count 3 \\
  --node-vm-size Standard_D4s_v3 \\
  --enable-cluster-autoscaler \\
  --min-count 2 \\
  --max-count 10`}</code></pre>
                            </div>

                            <div>
                                <h4 className="font-medium mb-2">2. Create Storage Account</h4>
                                <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`# Create storage account
az storage account create \\
  --name ditsstorage \\
  --resource-group dits-rg \\
  --location eastus \\
  --sku Standard_LRS

# Create container
az storage container create \\
  --name chunks \\
  --account-name ditsstorage`}</code></pre>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <h2>Cost Optimization</h2>

            <div className="grid gap-6 md:grid-cols-2 my-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary" />
                            Compute Optimization
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-2">
                            <li>Use spot/preemptible instances for workers</li>
                            <li>Right-size your instances</li>
                            <li>Enable auto-scaling with appropriate limits</li>
                            <li>Use reserved instances for baseline capacity</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            Storage Optimization
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-2">
                            <li>Use storage tiers (hot/cold/archive)</li>
                            <li>Enable deduplication at storage level</li>
                            <li>Set lifecycle policies for old data</li>
                            <li>Use regional storage for better pricing</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <h2>Multi-Region Deployment</h2>

            <p>
                For global teams, deploy Dits across multiple regions for low latency
                and high availability:
            </p>

            <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`# Example multi-region Helm values
regions:
  - name: us-east
    primary: true
    storage:
      bucket: dits-chunks-us-east
    
  - name: eu-west
    primary: false
    storage:
      bucket: dits-chunks-eu-west
    replicate_from: us-east

  - name: ap-southeast
    primary: false
    storage:
      bucket: dits-chunks-ap-southeast
    replicate_from: us-east`}</code></pre>

            <Alert className="not-prose my-6">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Enterprise Support</AlertTitle>
                <AlertDescription>
                    For complex cloud deployments, our team can help with architecture
                    design and implementation. <Link href="/contact" className="underline">Contact us</Link> for details.
                </AlertDescription>
            </Alert>
        </div>
    );
}
