import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function MyAppPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Webapps</h1>
        <Link href="/">
          <Button variant="ghost">Back to Home</Button>
        </Link>
      </div>
      <div className="bg-white dark:bg-zinc-900 border rounded-lg p-10 text-center">
        <p className="text-zinc-500">
          This section will list your webapps from the `myApp` schema.
        </p>
      </div>
    </div>
  );
}
