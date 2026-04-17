import Link from "next/link";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <Card>
        <CardTitle className="text-2xl">Nothing here</CardTitle>
        <CardDescription>
          This page doesn&apos;t exist. If you followed a link, the market address may have
          changed or the URL is mistyped.
        </CardDescription>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/">
            <Button variant="primary">Back to markets</Button>
          </Link>
          <Link href="/about">
            <Button variant="secondary">About this demo</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
