import { Metadata } from "next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Heart, Users, Shield, Scale, Check, X } from "lucide-react";

export const metadata: Metadata = {
    title: "Code of Conduct",
    description: "Community guidelines and code of conduct for the Dits project",
};

export default function CodeOfConductPage() {
    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1>Code of Conduct</h1>
            <p className="lead text-xl text-muted-foreground">
                Our community is dedicated to providing a welcoming, inclusive, and
                harassment-free experience for everyone.
            </p>

            <Alert className="not-prose my-6">
                <Heart className="h-4 w-4" />
                <AlertTitle>Our Commitment</AlertTitle>
                <AlertDescription>
                    We are committed to making participation in our community a positive
                    experience for everyone, regardless of background or identity.
                </AlertDescription>
            </Alert>

            <h2>Our Pledge</h2>

            <p>
                In the interest of fostering an open and welcoming environment, we as
                contributors and maintainers pledge to make participation in our project
                and our community a harassment-free experience for everyone, regardless of:
            </p>

            <ul>
                <li>Age, body size, disability, ethnicity, sex characteristics</li>
                <li>Gender identity and expression, level of experience</li>
                <li>Education, socio-economic status, nationality</li>
                <li>Personal appearance, race, religion, or sexual identity and orientation</li>
            </ul>

            <h2>Our Standards</h2>

            <div className="grid gap-6 md:grid-cols-2 my-8">
                <div className="bg-primary/5 p-6 rounded-lg border border-primary/20">
                    <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                        <Users className="h-5 w-5 text-primary" />
                        Positive Behavior
                    </h3>
                    <ul className="text-sm space-y-2">
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Using welcoming and inclusive language</li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Being respectful of differing viewpoints</li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Gracefully accepting constructive criticism</li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Focusing on what is best for the community</li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Showing empathy towards other community members</li>
                    </ul>
                </div>

                <div className="bg-destructive/5 p-6 rounded-lg border border-destructive/20">
                    <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                        <Shield className="h-5 w-5 text-destructive" />
                        Unacceptable Behavior
                    </h3>
                    <ul className="text-sm space-y-2">
                        <li className="flex items-center gap-2"><X className="h-4 w-4 text-red-600" /> Sexualized language or imagery</li>
                        <li className="flex items-center gap-2"><X className="h-4 w-4 text-red-600" /> Trolling, insulting comments, personal attacks</li>
                        <li className="flex items-center gap-2"><X className="h-4 w-4 text-red-600" /> Public or private harassment</li>
                        <li className="flex items-center gap-2"><X className="h-4 w-4 text-red-600" /> Publishing others&apos; private information</li>
                        <li className="flex items-center gap-2"><X className="h-4 w-4 text-red-600" /> Other conduct inappropriate in a professional setting</li>
                    </ul>
                </div>
            </div>

            <h2>Our Responsibilities</h2>

            <p>
                Project maintainers are responsible for clarifying the standards of acceptable
                behavior and are expected to take appropriate and fair corrective action in
                response to any instances of unacceptable behavior.
            </p>

            <p>
                Project maintainers have the right and responsibility to remove, edit, or
                reject comments, commits, code, wiki edits, issues, and other contributions
                that are not aligned to this Code of Conduct, or to ban temporarily or
                permanently any contributor for other behaviors that they deem inappropriate,
                threatening, offensive, or harmful.
            </p>

            <h2>Scope</h2>

            <p>
                This Code of Conduct applies both within project spaces and in public spaces
                when an individual is representing the project or its community. Examples of
                representing a project or community include:
            </p>

            <ul>
                <li>Using an official project e-mail address</li>
                <li>Posting via an official social media account</li>
                <li>Acting as an appointed representative at an online or offline event</li>
            </ul>

            <h2>Enforcement</h2>

            <div className="bg-muted p-6 rounded-lg my-6">
                <h3 className="flex items-center gap-2 font-semibold mb-4">
                    <Scale className="h-5 w-5" />
                    Enforcement Process
                </h3>
                <ol className="space-y-3">
                    <li>
                        <strong>1. Report:</strong> Instances of abusive, harassing, or otherwise
                        unacceptable behavior may be reported by contacting the project team at{" "}
                        <a href="mailto:conduct@dits.io" className="text-primary">conduct@dits.io</a>.
                    </li>
                    <li>
                        <strong>2. Review:</strong> All complaints will be reviewed and investigated
                        promptly and fairly.
                    </li>
                    <li>
                        <strong>3. Response:</strong> The project team will determine the appropriate
                        response, which may include a warning, temporary ban, or permanent ban.
                    </li>
                    <li>
                        <strong>4. Confidentiality:</strong> All reports will be handled with
                        discretion. The identity of the reporter will be kept confidential.
                    </li>
                </ol>
            </div>

            <h2>Enforcement Guidelines</h2>

            <p>
                Community leaders will follow these Community Impact Guidelines in determining
                the consequences for any action they deem in violation of this Code of Conduct:
            </p>

            <h3>1. Correction</h3>
            <p>
                <strong>Community Impact:</strong> Use of inappropriate language or other behavior
                deemed unprofessional or unwelcome in the community.
            </p>
            <p>
                <strong>Consequence:</strong> A private, written warning from community leaders,
                providing clarity around the nature of the violation and an explanation of why
                the behavior was inappropriate.
            </p>

            <h3>2. Warning</h3>
            <p>
                <strong>Community Impact:</strong> A violation through a single incident or series
                of actions.
            </p>
            <p>
                <strong>Consequence:</strong> A warning with consequences for continued behavior.
                No interaction with the people involved for a specified period of time.
            </p>

            <h3>3. Temporary Ban</h3>
            <p>
                <strong>Community Impact:</strong> A serious violation of community standards,
                including sustained inappropriate behavior.
            </p>
            <p>
                <strong>Consequence:</strong> A temporary ban from any sort of interaction or
                public communication with the community for a specified period of time.
            </p>

            <h3>4. Permanent Ban</h3>
            <p>
                <strong>Community Impact:</strong> Demonstrating a pattern of violation of community
                standards, including sustained inappropriate behavior, harassment of an individual,
                or aggression toward or disparagement of classes of individuals.
            </p>
            <p>
                <strong>Consequence:</strong> A permanent ban from any sort of public interaction
                within the community.
            </p>

            <h2>Attribution</h2>

            <p>
                This Code of Conduct is adapted from the{" "}
                <a href="https://www.contributor-covenant.org" target="_blank" rel="noopener noreferrer">
                    Contributor Covenant
                </a>
                , version 2.1, available at{" "}
                <a href="https://www.contributor-covenant.org/version/2/1/code_of_conduct/" target="_blank" rel="noopener noreferrer">
                    https://www.contributor-covenant.org/version/2/1/code_of_conduct/
                </a>
                .
            </p>

            <Alert className="not-prose my-6">
                <Heart className="h-4 w-4" />
                <AlertTitle>Questions?</AlertTitle>
                <AlertDescription>
                    If you have questions about this Code of Conduct, please reach out to{" "}
                    <a href="mailto:conduct@dits.io" className="underline">conduct@dits.io</a>.
                </AlertDescription>
            </Alert>
        </div>
    );
}
