import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold text-stone-900">404</h1>
      <p className="mt-2 text-stone-500">This page could not be found. · لم يتم العثور على الصفحة</p>
      <Link href="/en" className="mt-6 inline-block font-semibold text-brand-600">AqarPro →</Link>
    </div>
  );
}
