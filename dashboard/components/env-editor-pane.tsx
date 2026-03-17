import type { EnvFileSnapshot, ServiceSnapshot } from "@/lib/types";
import { formatDateTime } from "@/lib/view-model";

type EnvEditorPaneProps = {
  selectedService: ServiceSnapshot | null;
  envSnapshot: EnvFileSnapshot | null;
  editorText: string;
  dirty: boolean;
  saving: boolean;
  onChange: (text: string) => void;
  onSave: () => void;
  onRevert: () => void;
};

export function EnvEditorPane({
  selectedService,
  envSnapshot,
  editorText,
  dirty,
  saving,
  onChange,
  onSave,
  onRevert,
}: EnvEditorPaneProps) {
  return (
    <section className="section-block surface editor-panel">
      <div className="section-bar">
        <div className="section-heading">
          <span className="section-tag">Env</span>
          <h2>{selectedService ? selectedService.label : "Editor"}</h2>
        </div>

        {selectedService ? (
          <span className="signal" data-tone={dirty ? "warning" : envSnapshot?.exists ? "good" : "accent"}>
            {dirty ? "Dirty" : envSnapshot?.exists ? "Saved" : "New"}
          </span>
        ) : null}
      </div>

      {selectedService && envSnapshot ? (
        <>
          <div className="editor-meta">
            <div className="detail-pair">
              <span>Path</span>
              <strong className="mono">{envSnapshot.path}</strong>
            </div>
            <div className="detail-pair">
              <span>State</span>
              <strong>{envSnapshot.exists ? "Existing" : "Create on save"}</strong>
            </div>
            <div className="detail-pair">
              <span>Updated</span>
              <strong>{formatDateTime(envSnapshot.modifiedAt)}</strong>
            </div>
          </div>

          <div className="editor-field">
            <label htmlFor="env-editor">Environment file</label>
            <textarea
              id="env-editor"
              value={editorText}
              onChange={(event) => onChange(event.target.value)}
            />
          </div>

          <div className="editor-toolbar">
            <span className="mini-note">{dirty ? "Unsaved changes" : "In sync"}</span>

            <div className="button-row">
              <button
                type="button"
                className="button button--solid"
                onClick={onSave}
                disabled={saving || !dirty}
              >
                {saving ? "Saving..." : "Save env"}
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={onRevert}
                disabled={!dirty}
              >
                Revert
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">Select a module to load its env file.</div>
      )}
    </section>
  );
}
