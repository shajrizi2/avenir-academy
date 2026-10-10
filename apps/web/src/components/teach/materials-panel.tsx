'use client';

import {
  MATERIAL_FILE_EXTENSIONS,
  MATERIAL_MAX_BYTES,
  type MaterialLinkInput,
  type MaterialSummary,
  materialLinkSchema,
} from '@ai-academy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { FileUp, FolderOpen, Link2, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FilterPills } from '@/components/filter-pills';
import { FormError } from '@/components/form-error';
import { TextField } from '@/components/form/text-field';
import { MaterialItem } from '@/components/learn/material-item';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch, apiUpload, errorMessage } from '@/lib/api';

const MAX_MB = MATERIAL_MAX_BYTES / 1024 / 1024;
const ACCEPT = MATERIAL_FILE_EXTENSIONS.map((ext) => `.${ext}`).join(',');

/** Materials of one module: add a link or upload a file (max 20 MB), or remove one. */
export function MaterialsPanel({
  moduleId,
  materials,
}: {
  moduleId: string;
  materials: MaterialSummary[];
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'LINK' | 'FILE'>('LINK');
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['modules', moduleId] }),
      queryClient.invalidateQueries({ queryKey: ['me', 'modules'] }),
    ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="flex items-center gap-2">
          <FolderOpen className="size-5" aria-hidden /> Materials
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-soft rounded-card space-y-4 p-4">
          <FilterPills
            label="Material type"
            options={[
              { value: 'LINK', label: 'Add a link' },
              { value: 'FILE', label: 'Upload a file' },
            ]}
            value={mode}
            onChange={setMode}
          />
          {mode === 'LINK' ? (
            <LinkForm moduleId={moduleId} onAdded={refresh} />
          ) : (
            <FileForm moduleId={moduleId} onAdded={refresh} />
          )}
        </div>

        {materials.length === 0 ? (
          <p className="text-ink-soft">No materials yet. Students see them on the module page.</p>
        ) : (
          <ul className="space-y-3">
            {materials.map((material) => (
              <MaterialItem key={material.id} material={material}>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label={`Delete ${material.title}`}>
                      <Trash2 />
                    </Button>
                  }
                  title="Delete this material?"
                  description="Students will no longer see it. Uploaded files are deleted from the server."
                  confirmLabel="Delete"
                  onConfirm={async () => {
                    try {
                      await apiFetch(`/materials/${material.id}`, { method: 'DELETE' });
                      toast.success('Material deleted');
                      await refresh();
                    } catch (e) {
                      toast.error(errorMessage(e));
                      throw e;
                    }
                  }}
                />
              </MaterialItem>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function LinkForm({ moduleId, onAdded }: { moduleId: string; onAdded: () => Promise<unknown> }) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<MaterialLinkInput>({
    resolver: zodResolver(materialLinkSchema),
    defaultValues: { title: '', url: '' },
  });
  const submit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await apiFetch(`/modules/${moduleId}/materials`, { method: 'POST', body: values });
      toast.success('Link added');
      form.reset();
      await onAdded();
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <FieldGroup>
        <FormError message={error} />
        <TextField form={form} name="title" label="Title" placeholder="Slides for week 1" />
        <TextField form={form} name="url" label="Link" type="url" placeholder="https://…" />
        <div>
          <Button type="submit" variant="chunky" disabled={form.formState.isSubmitting}>
            <Link2 data-icon="inline-start" /> Add link
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

function FileForm({ moduleId, onAdded }: { moduleId: string; onAdded: () => Promise<unknown> }) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 2) return setError('Give the file a title (at least 2 characters).');
    if (!file) return setError('Choose a file to upload.');
    if (file.size > MATERIAL_MAX_BYTES) return setError(`The file is larger than ${MAX_MB} MB.`);

    const form = new FormData();
    form.set('title', title.trim());
    form.set('file', file);
    setUploading(true);
    try {
      await apiUpload(`/modules/${moduleId}/materials`, form);
      toast.success('File uploaded');
      setTitle('');
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      await onAdded();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={(e) => void upload(e)} noValidate>
      <FieldGroup>
        <FormError message={error} />
        <div className="grid gap-2">
          <Label htmlFor="material-title">Title</Label>
          <Input
            id="material-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Worksheet: prompt patterns"
            maxLength={120}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="material-file">File</Label>
          <Input
            id="material-file"
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="h-auto py-2.5"
          />
          <p className="text-ink-soft text-sm">
            Up to {MAX_MB} MB: {MATERIAL_FILE_EXTENSIONS.join(', ')}.
          </p>
        </div>
        <div>
          <Button type="submit" variant="chunky" disabled={uploading}>
            <FileUp data-icon="inline-start" /> {uploading ? 'Uploading…' : 'Upload file'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
