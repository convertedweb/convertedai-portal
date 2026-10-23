"use client";

export function SelectAll({ formId }: { formId: string }) {
  return (
    <label className="select-all">
      <input
        onChange={(event) => document.querySelectorAll<HTMLInputElement>(`input[name="notificationKey"][form="${formId}"]`).forEach((input) => { input.checked = event.target.checked; })}
        type="checkbox"
      />
      Összes kijelölése
    </label>
  );
}
