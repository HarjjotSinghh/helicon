import { useEffect, useState } from "react";
import { useApp, useController } from "../../app/context.js";
import { Modal } from "../ui/overlays.js";
import { Button } from "../ui/primitives.js";

export function AddProjectDialog() {
  const controller = useController();
  const open = useApp((s) => s.addProjectOpen);
  const busy = useApp((s) => Boolean(s.busy["addProject"]));
  const platform = useApp((s) => s.env?.platform ?? "");
  const [path, setPath] = useState("");
  useEffect(() => {
    if (open) {
      setPath("");
    }
  }, [open]);
  const windows = platform === "win32";
  return (
    <Modal
      open={open}
      onOpenChange={(next) => controller.setAddProjectOpen(next)}
      title="Add a project"
      description="Muse works inside this folder. Threads it already has for the folder appear in the sidebar."
    >
      <form
        className="mt-5 flex flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          void controller.addProject(path);
        }}
      >
        <label htmlFor="helicon-project-path" className="text-xs font-medium text-muted">
          Folder path
        </label>
        <input
          id="helicon-project-path"
          autoFocus
          value={path}
          spellCheck={false}
          autoComplete="off"
          placeholder={windows ? "D:\\Projects\\my-app" : "/home/you/code/my-app"}
          onChange={(event) => setPath(event.currentTarget.value)}
          className="mt-1.5 h-10 w-full rounded-lg bg-sunken px-3 font-mono text-base text-fg shadow-[0_0_0_1px_var(--border-strong)] outline-none focus-visible:shadow-[0_0_0_2px_var(--accent)] focus-visible:outline-none sm:text-sm"
        />
        <p className="mt-2 text-xs leading-relaxed text-muted">
          {windows
            ? "Windows paths like D:\\work\\app and WSL paths like /home/you/app both work. Helicon translates them for Muse in WSL."
            : "Use the absolute path to the folder."}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => controller.setAddProjectOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={busy} disabled={!path.trim()}>
            Add project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
