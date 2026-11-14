import { redirect } from 'next/navigation';

/** Until the job board launches, the home page is the academy's landing page. */
export default function RootPage() {
  redirect('/training');
}
