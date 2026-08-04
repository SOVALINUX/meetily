'use client';

import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { Pencil, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TemplateInfo {
  id: string;
  name: string;
  description: string;
}

interface TemplateSectionFull {
  title: string;
  instruction: string;
  format: string;
  item_format?: string;
  example_item_format?: string;
}

interface TemplateFullDetails {
  id: string;
  name: string;
  description: string;
  sections: TemplateSectionFull[];
}

const BUNDLED_TEMPLATE_IDS = new Set([
  'daily_standup',
  'standard_meeting',
  'retrospective',
  'project_sync',
  'sales_marketing_client_call',
  'psychatric_session',
]);

const FORMAT_OPTIONS = ['paragraph', 'list', 'string'] as const;

function SectionEditor({
  section,
  index,
  onChange,
}: {
  section: TemplateSectionFull;
  index: number;
  onChange: (index: number, updated: TemplateSectionFull) => void;
}) {
  return (
    <div className="border border-gray-200 rounded-md p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide w-6">{index + 1}</span>
        <input
          type="text"
          value={section.title}
          onChange={(e) => onChange(index, { ...section, title: e.target.value })}
          placeholder="Section title"
          className="flex-1 text-sm font-medium border-0 border-b border-gray-200 focus:border-blue-400 focus:outline-none py-1 bg-transparent"
        />
        <Select
          value={section.format}
          onValueChange={(val) => onChange(index, { ...section, format: val })}
        >
          <SelectTrigger className="w-28 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMAT_OPTIONS.map((f) => (
              <SelectItem key={f} value={f} className="text-xs">
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <textarea
        value={section.instruction}
        onChange={(e) => onChange(index, { ...section, instruction: e.target.value })}
        placeholder="Instruction for the AI on what to extract for this section"
        rows={3}
        className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-y bg-white"
      />
    </div>
  );
}

export function TemplateManagementSettings() {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateFullDetails | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke<TemplateInfo[]>('api_list_templates');
      setTemplates(result);
    } catch (err) {
      console.error('Failed to load templates:', err);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on first render
  useState(() => {
    fetchTemplates();
  });

  const openEditor = async (templateId: string) => {
    try {
      const full = await invoke<TemplateFullDetails>('api_get_template_full', {
        templateId,
      });
      setEditingTemplate(full);
      setDialogOpen(true);
    } catch (err) {
      console.error('Failed to load template details:', err);
      toast.error('Failed to open template editor');
    }
  };

  const handleSectionChange = (index: number, updated: TemplateSectionFull) => {
    if (!editingTemplate) return;
    const sections = [...editingTemplate.sections];
    sections[index] = updated;
    setEditingTemplate({ ...editingTemplate, sections });
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      const json = JSON.stringify(
        {
          name: editingTemplate.name,
          description: editingTemplate.description,
          sections: editingTemplate.sections,
        },
        null,
        2
      );
      await invoke('api_save_custom_template', {
        templateId: editingTemplate.id,
        templateJson: json,
      });
      toast.success('Template saved', {
        description: `"${editingTemplate.name}" has been saved as a custom template.`,
      });
      setDialogOpen(false);
      fetchTemplates();
    } catch (err) {
      console.error('Failed to save template:', err);
      toast.error('Failed to save template', {
        description: typeof err === 'string' ? err : 'Validation or file system error.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (templateId: string, templateName: string) => {
    try {
      await invoke('api_delete_custom_template', { templateId });
      toast.success('Template reset', {
        description: `"${templateName}" has been reset to the default.`,
      });
      fetchTemplates();
    } catch (err) {
      console.error('Failed to reset template:', err);
      toast.error('Failed to reset template');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Summary Templates</h3>
      <p className="text-sm text-gray-600 mb-4">
        Edit the instructions each template section gives to the AI. Your edits are saved as custom overrides and can be reset to the original at any time.
      </p>

      {loading ? (
        <p className="text-sm text-gray-400">Loading templates…</p>
      ) : (
        <div className="space-y-2">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="flex items-center justify-between rounded-md border border-gray-100 px-4 py-3 hover:border-gray-200 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{tmpl.name}</p>
                <p className="text-xs text-gray-500 truncate">{tmpl.description}</p>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                {BUNDLED_TEMPLATE_IDS.has(tmpl.id) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
                    onClick={() => handleReset(tmpl.id, tmpl.name)}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => openEditor(tmpl.id)}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Template: {editingTemplate?.name}
            </DialogTitle>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Template Name
                </label>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, name: e.target.value })
                  }
                  className="mt-1 w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Description
                </label>
                <input
                  type="text"
                  value={editingTemplate.description}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, description: e.target.value })
                  }
                  className="mt-1 w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                  Sections
                </label>
                <div className="space-y-3">
                  {editingTemplate.sections.map((section, i) => (
                    <SectionEditor
                      key={i}
                      section={section}
                      index={i}
                      onChange={handleSectionChange}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
