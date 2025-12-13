import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Gamepad2, Camera, Music, Palette, Film } from "lucide-react";

export const metadata: Metadata = {
  title: "Practical Examples",
  description: "Real-world examples of using Dits for creative workflows",
};

export default function ExamplesPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Practical Examples</h1>
      <p className="lead text-xl text-muted-foreground">
        Real-world workflows showing how Dits transforms creative collaboration.
        See how teams use Dits for video production, game development, photography, and more.
      </p>

      <Tabs defaultValue="video-editing" className="not-prose my-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="video-editing">Video Editing</TabsTrigger>
          <TabsTrigger value="game-dev">Game Development</TabsTrigger>
          <TabsTrigger value="photography">Photography</TabsTrigger>
        </TabsList>

        <TabsContent value="video-editing" className="mt-6">
          <div className="flex items-center gap-2 mb-6">
            <Film className="h-6 w-6 text-primary" />
            <h2>Video Production Workflow</h2>
          </div>

          <div className="not-prose grid gap-6 md:grid-cols-2 my-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Feature Film Post-Production
                </CardTitle>
                <CardDescription>
                  How a 50-person VFX team manages 500TB of footage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold">The Challenge</h4>
                  <p className="text-sm text-muted-foreground">
                    Multiple editors working on the same scenes, daily dailies delivery,
                    VFX artists modifying shots, colorists applying looks.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold">Dits Solution</h4>
                  <pre className="bg-muted p-3 rounded text-xs">
                    <code>{`# Editor workflow
dits checkout scene-45-v2
dits mount /Volumes/dailies  # Access all footage on-demand
# Edit in Premiere/FCP, make changes
dits add scene-45-v2.prproj
dits commit -m "Refined pacing in scene 45"

# VFX artist workflow
dits checkout vfx-shots
dits pull origin main  # Get latest edits
# Modify CG elements, render new versions
dits add shot-127-vfx.exr
dits commit -m "Added particle effects to shot 127"`}</code>
                  </pre>
                </div>

                <div>
                  <h4 className="font-semibold">Benefits</h4>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>Zero duplication:</strong> Same footage shared across all versions</li>
                    <li>• <strong>Instant access:</strong> 500TB appears as local drive</li>
                    <li>• <strong>Conflict prevention:</strong> Locks prevent simultaneous edits</li>
                    <li>• <strong>Version traceability:</strong> Every change tracked and revertible</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>YouTube Creator Pipeline</CardTitle>
                <CardDescription>
                  From raw footage to published video with full revision history
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold">Daily Workflow</h4>
                  <pre className="bg-muted p-3 rounded text-xs">
                    <code>{`# Start new video project
dits init cooking-tutorial-2024
dits checkout -b main

# Import raw footage
dits add raw-footage/
dits commit -m "Import raw footage from shoot"

# Create branches for different edits
dits checkout -b edit-v1
# Edit in DaVinci Resolve, try different cuts
dits add project.drp
dits commit -m "First edit pass - 8 minute version"

dits checkout -b edit-v2
dits cherry-pick edit-v1  # Start from v1
# Refine edit, improve pacing
dits commit -m "Second pass - 6 minute version"`}</code>
                  </pre>
                </div>

                <div>
                  <h4 className="font-semibold">Publishing & Archiving</h4>
                  <pre className="bg-muted p-3 rounded text-xs">
                    <code>{`# Final version ready
dits checkout main
dits merge edit-v2
dits tag v1.0-published

# Archive with metadata
dits add final-video.mp4 thumbnails/ music/
dits commit -m "Published: How to Cook Perfect Pasta"

# Share with team
dits remote add team /Volumes/team-drive/project
dits push team main`}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="game-dev" className="mt-6">
          <div className="flex items-center gap-2 mb-6">
            <Gamepad2 className="h-6 w-6 text-primary" />
            <h2>Game Development Pipeline</h2>
          </div>

          <div className="not-prose grid gap-6 md:grid-cols-2 my-6">
            <Card>
              <CardHeader>
                <CardTitle>Unity/Unreal Asset Management</CardTitle>
                <CardDescription>
                  Version control for game assets, builds, and collaboration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold">Asset Pipeline</h4>
                  <pre className="bg-muted p-3 rounded text-xs">
                    <code>{`# Initialize game project
dits init my-awesome-game
dits add Assets/ ProjectSettings/
dits commit -m "Initial Unity project setup"

# Artists add assets
dits checkout -b art-assets
dits add Assets/Models/ Assets/Textures/
dits commit -m "Character models and textures"

# Programmers add scripts
dits checkout -b code
dits add Assets/Scripts/ Assets/Prefabs/
dits commit -m "Player controller and UI system"`}</code>
                  </pre>
                </div>

                <div>
                  <h4 className="font-semibold">Build Management</h4>
                  <pre className="bg-muted p-3 rounded text-xs">
                    <code>{`# Create build branch
dits checkout -b builds
dits merge art-assets
dits merge code

# Build game
# (Unity build process...)
dits add Builds/  # Add built executables
dits commit -m "Build v0.1.2 - Windows + Mac"

# Tag release
dits tag release-0.1.2`}</code>
                  </pre>
                </div>

                <div>
                  <Badge variant="secondary" className="mb-2">Pro Tip</Badge>
                  <p className="text-sm">
                    Use Dits locks for binary assets to prevent merge conflicts:
                    <code className="block mt-1">dits lock Assets/BinaryAsset.bytes</code>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Indie Game Team Workflow</CardTitle>
                <CardDescription>
                  3-person team shipping updates weekly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold">Weekly Development Cycle</h4>
                  <pre className="bg-muted p-3 rounded text-xs">
                    <code>{`# Monday: Plan sprint
dits checkout main
dits pull origin main
dits checkout -b sprint-12

# Throughout week: Daily commits
dits add Assets/NewFeature/
dits commit -m "feat: Add inventory system"

dits add Assets/Bugfix/
dits commit -m "fix: Resolve collision detection"`}</code>
                  </pre>
                </div>

                <div>
                  <h4 className="font-semibold">Friday: Integration & Testing</h4>
                  <pre className="bg-muted p-3 rounded text-xs">
                    <code>{`# Merge feature branches
dits checkout main
dits merge sprint-12

# Create test build
dits checkout -b builds
dits add Builds/Test/
dits commit -m "Test build for QA"

# QA team tests
dits checkout builds
dits mount /Volumes/game-builds
# Test the game...

# Release if approved
dits checkout main
dits tag v1.2.0-release
dits push origin main --tags`}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="photography" className="mt-6">
          <div className="flex items-center gap-2 mb-6">
            <Camera className="h-6 w-6 text-primary" />
            <h2>Photography Workflow</h2>
          </div>

          <div className="not-prose grid gap-6 md:grid-cols-2 my-6">
            <Card>
              <CardHeader>
                <CardTitle>Wedding Photography Business</CardTitle>
                <CardDescription>
                  Managing client photos, edits, and deliverables
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold">Photo Session Workflow</h4>
                  <pre className="bg-muted p-3 rounded text-xs">
                    <code>{`# Start new wedding project
dits init smith-jones-wedding-2024
dits add raw-photos/
dits commit -m "Import all raw photos from shoot"

# Create editing branches
dits checkout -b ceremony-edits
dits checkout -b reception-edits
dits checkout -b portraits-edits

# Edit photos (in Lightroom/Photoshop)
dits add edited-photos/
dits commit -m "Edited ceremony photos - improved exposure"`}</code>
                  </pre>
                </div>

                <div>
                  <h4 className="font-semibold">Client Delivery</h4>
                  <pre className="bg-muted p-3 rounded text-xs">
                    <code>{`# Merge all edits
dits checkout main
dits merge ceremony-edits
dits merge reception-edits
dits merge portraits-edits

# Create delivery package
dits add client-delivery/
dits commit -m "Final edits for client delivery"

# Tag for archival
dits tag delivered-2024-06-15

# Share with client (optional)
dits remote add client /Volumes/client-drive
dits push client main`}</code>
                  </pre>
                </div>

                <div>
                  <Badge variant="secondary" className="mb-2">Storage Savings</Badge>
                  <p className="text-sm">
                    RAW files are deduplicated automatically. 1000 RAW photos (50GB)
                    with edits typically store in 60GB instead of 150GB+.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stock Photography Management</CardTitle>
                <CardDescription>
                  Organizing and versioning a large photo library
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold">Library Organization</h4>
                  <pre className="bg-muted p-3 rounded text-xs">
                    <code>{`# Initialize stock library
dits init stock-photography
dits add categories/ metadata/
dits commit -m "Initial library structure"

# Add new photo batch
dits add new-photos-2024/
dits commit -m "Added 500 new landscape photos"

# Organize by categories
dits checkout -b categorization
dits add organized-landscapes/ organized-portraits/
dits commit -m "Organized photos by category"`}</code>
                  </pre>
                </div>

                <div>
                  <h4 className="font-semibold">Version Control for Edits</h4>
                  <pre className="bg-muted p-3 rounded text-xs">
                    <code>{`# Create editing branch for specific photo
dits checkout -b edit-landscape-001
dits add edited-photos/landscape-001.psd
dits commit -m "Enhanced colors and contrast"

# Compare versions
dits log --oneline edited-photos/landscape-001.psd
dits diff HEAD~1 edited-photos/landscape-001.psd

# Merge approved edits
dits checkout main
dits merge edit-landscape-001`}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="not-prose bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-6 my-8">
        <h2>Workflow Patterns</h2>

        <div className="grid gap-4 md:grid-cols-3 my-4">
          <div>
            <h3 className="font-semibold mb-2">Branching Strategy</h3>
            <ul className="text-sm space-y-1">
              <li><code>main</code> - Production ready</li>
              <li><code>feature/*</code> - New features</li>
              <li><code>edit/*</code> - Creative iterations</li>
              <li><code>builds</code> - Generated assets</li>
              <li><code>releases</code> - Tagged versions</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Commit Message Convention</h3>
            <ul className="text-sm space-y-1">
              <li><code>feat:</code> New features/assets</li>
              <li><code>fix:</code> Bug fixes</li>
              <li><code>edit:</code> Creative changes</li>
              <li><code>refactor:</code> Code restructuring</li>
              <li><code>build:</code> Generated assets</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">File Organization</h3>
            <ul className="text-sm space-y-1">
              <li><code>raw/</code> - Source files</li>
              <li><code>edited/</code> - Modified assets</li>
              <li><code>final/</code> - Production ready</li>
              <li><code>builds/</code> - Generated content</li>
              <li><code>metadata/</code> - Project files</li>
            </ul>
          </div>
        </div>
      </div>

      <h2>Performance Expectations</h2>
      <p>Real-world performance based on file types and workflows:</p>

      <div className="not-prose overflow-x-auto my-6">
        <table className="w-full border-collapse border border-gray-300 dark:border-gray-700">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">Workflow</th>
              <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">File Types</th>
              <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">Storage Savings</th>
              <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left">Network Efficiency</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">Video Editing</td>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">MP4, MOV, PRPROJ</td>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">85-95%</td>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">98%+ delta sync</td>
            </tr>
            <tr>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">Game Assets</td>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">Textures, Models, Builds</td>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">70-90%</td>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">95%+ delta sync</td>
            </tr>
            <tr>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">Photography</td>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">RAW, PSD, JPEG</td>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">60-80%</td>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">90%+ delta sync</td>
            </tr>
            <tr>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">Music Production</td>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">WAV, STEMS, Projects</td>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">75-90%</td>
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">95%+ delta sync</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Next Steps</h2>
      <p>
        Ready to try Dits for your creative workflow? Start with our{" "}
        <Link href="/docs/getting-started">Getting Started guide</Link>{" "}
        or explore specific documentation for your use case:
      </p>

      <div className="not-prose grid gap-3 md:grid-cols-2 lg:grid-cols-4 my-4">
        <Link href="/docs/advanced/video" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Video className="h-4 w-4" />
                Video Features
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/docs/advanced/vfs" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                VFS & Mounting
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/docs/cli/locks" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="h-4 w-4" />
                File Locking
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/docs/deployment" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Music className="h-4 w-4" />
                Deployment
              </CardTitle>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}

