import { Metadata } from "next";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Rocket, Clock, CheckCircle, Circle, Zap, Shield, Globe } from "lucide-react";

export const metadata: Metadata = {
    title: "Roadmap",
    description: "Dits development roadmap and upcoming features",
};

export default function RoadmapPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1>Roadmap</h1>
            <p className="lead text-xl text-muted-foreground">
                Our vision for Dits and the features we&apos;re working on. This roadmap
                is a living document that evolves based on community feedback.
            </p>

            <Alert className="not-prose my-6">
                <Rocket className="h-4 w-4" />
                <AlertTitle>Community Driven</AlertTitle>
                <AlertDescription>
                    Have a feature request? Open an issue on GitHub or join the discussion
                    to help shape the future of Dits.
                </AlertDescription>
            </Alert>

            <h2>Current Status</h2>

            <div className="grid gap-4 md:grid-cols-3 my-8 not-prose">
                <Card className="border-primary/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <CheckCircle className="h-5 w-5 text-primary" />
                            Stable
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Core versioning engine</li>
                            <li>Content-defined chunking</li>
                            <li>Local repositories</li>
                            <li>Basic CLI</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="border-yellow-500/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Clock className="h-5 w-5 text-yellow-500" />
                            In Progress
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Remote repositories</li>
                            <li>P2P synchronization</li>
                            <li>Video optimization</li>
                            <li>Encryption layer</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Circle className="h-5 w-5 text-muted-foreground" />
                            Planned
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>GUI application</li>
                            <li>IDE integrations</li>
                            <li>Enterprise features</li>
                            <li>Cloud hosting</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <h2>Q1 2025: Foundation</h2>

            <div className="space-y-4 my-6">
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold m-0">Core Engine Stabilization</h3>
                            <Badge variant="secondary">Completed</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground m-0">
                            Stable chunking algorithms, content addressing, and local repository management.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold m-0">CLI v1.0</h3>
                            <Badge variant="secondary">Completed</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground m-0">
                            Full-featured command-line interface with Git-like commands and workflows.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-500 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold m-0">Documentation Site</h3>
                            <Badge variant="outline">In Progress</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground m-0">
                            Comprehensive documentation with guides, API reference, and examples.
                        </p>
                    </div>
                </div>
            </div>

            <h2>Q2 2025: Networking</h2>

            <div className="space-y-4 my-6">
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-500 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold m-0">Remote Repositories</h3>
                            <Badge variant="outline">In Progress</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground m-0">
                            Push and pull to remote servers with authentication and access control.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-500 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold m-0">P2P Synchronization</h3>
                            <Badge variant="outline">In Progress</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground m-0">
                            Direct peer-to-peer syncing without central server using libp2p.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg">
                    <Circle className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold m-0">Wire Protocol v1</h3>
                            <Badge variant="outline">Planned</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground m-0">
                            Efficient binary protocol for chunk transfer and metadata synchronization.
                        </p>
                    </div>
                </div>
            </div>

            <h2>Q3 2025: Advanced Features</h2>

            <div className="grid gap-6 md:grid-cols-2 my-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary" />
                            Video Optimization
                        </CardTitle>
                        <CardDescription>
                            Smart chunking for video files
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>GOP-aligned chunking</li>
                            <li>Streaming support</li>
                            <li>Proxy file generation</li>
                            <li>Timeline-based versioning</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            Encryption Layer
                        </CardTitle>
                        <CardDescription>
                            End-to-end encryption
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Chunk-level encryption</li>
                            <li>Key management</li>
                            <li>Secure sharing</li>
                            <li>Audit logging</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <h2>Q4 2025: Ecosystem</h2>

            <div className="grid gap-6 md:grid-cols-2 my-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-primary" />
                            Ditshub Platform
                        </CardTitle>
                        <CardDescription>
                            Cloud hosting platform
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>Managed hosting</li>
                            <li>Collaboration features</li>
                            <li>CI/CD integration</li>
                            <li>Analytics dashboard</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Rocket className="h-5 w-5 text-primary" />
                            Integrations
                        </CardTitle>
                        <CardDescription>
                            IDE and tool integrations
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-1">
                            <li>VS Code extension</li>
                            <li>JetBrains plugin</li>
                            <li>Adobe integration</li>
                            <li>Figma plugin</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <h2>Future Vision</h2>

            <div className="bg-muted p-6 rounded-lg my-6">
                <h3 className="font-semibold mb-4">Long-Term Goals</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-medium mb-2">Technical</h4>
                        <ul className="text-sm space-y-1">
                            <li>WASM runtime for cross-platform</li>
                            <li>Mobile app support</li>
                            <li>Real-time collaboration</li>
                            <li>AI-powered features</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-medium mb-2">Community</h4>
                        <ul className="text-sm space-y-1">
                            <li>Plugin ecosystem</li>
                            <li>Certification program</li>
                            <li>Enterprise support</li>
                            <li>Global community events</li>
                        </ul>
                    </div>
                </div>
            </div>

            <Alert className="not-prose my-6">
                <Rocket className="h-4 w-4" />
                <AlertTitle>Want to Contribute?</AlertTitle>
                <AlertDescription>
                    Check out our <a href="/docs/contributing" className="underline">contributing guide</a> to
                    help make these features a reality.
                </AlertDescription>
            </Alert>
        </div>
    );
}
