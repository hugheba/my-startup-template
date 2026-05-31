import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>my-startup-template</CardTitle>
          <CardDescription>
            Powered by BMAD. Run <code>pnpm bmad:init</code> to start brainstorming your product.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
        </CardContent>
      </Card>
    </main>
  );
}
