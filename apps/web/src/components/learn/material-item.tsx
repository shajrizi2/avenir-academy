'use client';

import type { MaterialSummary } from '@ai-academy/shared';
import { Download, ExternalLink, FileText, Link2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { fmt, t } from '@/i18n/messages';
import { apiDownload, errorMessage } from '@/lib/api';

/** One material: a link opens in a new tab; a file downloads through the API. */
export function MaterialItem({
  material,
  children,
}: {
  material: MaterialSummary;
  /** Extra actions (e.g. delete) for staff. */
  children?: React.ReactNode;
}) {
  const [downloading, setDownloading] = useState(false);
  const isFile = material.kind === 'FILE';
  const Icon = isFile ? FileText : Link2;

  async function download() {
    setDownloading(true);
    try {
      await apiDownload(
        `/materials/${material.id}/download`,
        `${material.title}.${material.fileType ?? ''}`,
      );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <li className="border-line rounded-card flex flex-wrap items-center gap-3 border p-3 sm:p-4">
      <span className="bg-track-ai-tint text-track-ai-ink flex size-10 shrink-0 items-center justify-center rounded-xl">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="text-ink font-bold break-words">{material.title}</p>
        <p className="text-ink-soft text-sm">
          {isFile
            ? fmt(t.learn.material.file, { type: material.fileType?.toUpperCase() ?? '' })
            : t.learn.material.link}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {isFile ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void download()}
            disabled={downloading}
          >
            <Download data-icon="inline-start" />{' '}
            {downloading ? t.learn.material.downloading : t.learn.material.download}
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <a href={material.url ?? '#'} target="_blank" rel="noopener noreferrer">
              {t.learn.material.open} <ExternalLink data-icon="inline-end" />
              <span className="sr-only">
                : {material.title} {t.common.opensInNewTab}
              </span>
            </a>
          </Button>
        )}
        {children}
      </div>
    </li>
  );
}
