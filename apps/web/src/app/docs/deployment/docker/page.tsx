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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Server, CheckCircle, Terminal, Settings } from "lucide-react";

export const metadata: Metadata = {
  title: "Docker Deployment",
  description: "Deploy Dits using Docker and Docker Compose for development and production",
};

export default function DockerPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Docker Deployment</h1>
      <p className="lead text-xl text-muted-foreground">
        Deploy Dits using Docker for quick setup and easy management.
        Perfect for development, testing, and small production deployments.
      </p>

      <Alert className="not-prose my-6">
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Quick Start</AlertTitle>
        <AlertDescription>
          Get Dits running in under 5 minutes with Docker Compose.
        </AlertDescription>
      </Alert>

      <h2>Prerequisites</h2>

      <ul>
        <li>Docker 20.10 or later</li>
        <li>Docker Compose v2.0 or later</li>
        <li>4GB RAM minimum (8GB recommended)</li>
        <li>20GB disk space minimum</li>
      </ul>

      <h2>Quick Start with Docker Compose</h2>

      <h3>1. Create docker-compose.yml</h3>
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`version: "3.8"

services:
  dits:
    image: dits/dits-server:latest
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://dits:ditspass@postgres:5432/dits
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=your-secure-secret-here
      - STORAGE_TYPE=local
      - STORAGE_PATH=/data/chunks
    volumes:
      - dits-data:/data
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=dits
      - POSTGRES_PASSWORD=ditspass
      - POSTGRES_DB=dits
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

volumes:
  dits-data:
  postgres-data:
  redis-data:`}</code></pre>

      <h3>2. Start the Stack</h3>
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f dits`}</code></pre>

      <h3>3. Verify Installation</h3>
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto"><code>{`# Check health endpoint
curl http://localhost:8080/health

# Configure CLI to use local server
dits remote add local http://localhost:8080`}</code></pre>

      <h2>Production Configuration</h2>

      <Tabs defaultValue="compose" className="not-prose my-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="compose">Docker Compose</TabsTrigger>
          <TabsTrigger value="single">Single Container</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Production docker-compose.yml
              </CardTitle>
              <CardDescription>
                Enhanced configuration with security and monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`version: "3.8"

services:
  dits:
    image: dits/dits-server:latest
    restart: always
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=\${DATABASE_URL}
      - REDIS_URL=\${REDIS_URL}
      - JWT_SECRET=\${JWT_SECRET}
      - LOG_LEVEL=info
      - METRICS_ENABLED=true
    volumes:
      - dits-data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G

  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      - POSTGRES_USER=dits
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
      - POSTGRES_DB=dits
    volumes:
      - postgres-data:/var/lib/postgresql/data
    secrets:
      - db_password

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data

secrets:
  db_password:
    file: ./secrets/db_password.txt

volumes:
  dits-data:
  postgres-data:
  redis-data:`}</code></pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="single" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Single Container Setup
              </CardTitle>
              <CardDescription>
                For simple deployments with external database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`docker run -d \\
  --name dits-server \\
  -p 8080:8080 \\
  -e DATABASE_URL="postgres://user:pass@host:5432/dits" \\
  -e REDIS_URL="redis://redis-host:6379" \\
  -e JWT_SECRET="your-secret" \\
  -v dits-data:/data \\
  --restart always \\
  dits/dits-server:latest`}</code></pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <h2>Environment Variables</h2>

      <div className="overflow-x-auto my-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variable</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Required</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono">DATABASE_URL</TableCell>
              <TableCell>PostgreSQL connection string</TableCell>
              <TableCell><CheckCircle className="h-4 w-4 text-primary" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono">REDIS_URL</TableCell>
              <TableCell>Redis connection URL</TableCell>
              <TableCell>Optional</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono">JWT_SECRET</TableCell>
              <TableCell>Secret for token signing</TableCell>
              <TableCell><CheckCircle className="h-4 w-4 text-primary" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono">STORAGE_PATH</TableCell>
              <TableCell>Path for chunk storage</TableCell>
              <TableCell>Default: /data</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono">LOG_LEVEL</TableCell>
              <TableCell>Logging verbosity</TableCell>
              <TableCell>Default: info</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <h2>Maintenance</h2>

      <div className="grid gap-6 md:grid-cols-2 my-8">
        <Card>
          <CardHeader>
            <CardTitle>Backup</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`# Backup database
docker exec dits-postgres \\
  pg_dump -U dits dits > backup.sql

# Backup volumes
docker run --rm \\
  -v dits-data:/data \\
  -v $(pwd):/backup \\
  alpine tar cvzf /backup/data.tar.gz /data`}</code></pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-background p-4 rounded-lg overflow-x-auto text-sm"><code>{`# Pull latest images
docker compose pull

# Restart with new images
docker compose up -d

# Check status
docker compose ps`}</code></pre>
          </CardContent>
        </Card>
      </div>

      <Alert className="not-prose my-6">
        <Settings className="h-4 w-4" />
        <AlertTitle>Next Steps</AlertTitle>
        <AlertDescription>
          For high-availability production deployments, consider using Kubernetes
          for automatic scaling and failover.
        </AlertDescription>
      </Alert>
    </div>
  );
}
