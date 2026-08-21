"use client";

import { Check, ChevronDown, ChevronRight, FolderKanban, Phone, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { AdminProjectListItem } from "@/lib/admin-data";
import { categoryLabels, statusLabels, type ProjectStatus } from "@/lib/project-types";

const statusOptions: Array<{ value: "all" | ProjectStatus; label: string }> = [
  { value: "all", label: "Összes státusz" },
  { value: "draft", label: statusLabels.draft },
  { value: "review_requested", label: statusLabels.review_requested },
  { value: "building", label: statusLabels.building },
  { value: "live", label: statusLabels.live },
  { value: "paused", label: statusLabels.paused },
  { value: "archived", label: statusLabels.archived },
];

export function AdminProjectsTable({ projects }: { projects: AdminProjectListItem[] }) {
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [status, setStatus] = useState<"all" | ProjectStatus>("all");

  const customers = useMemo(() => {
    return Array.from(
      new Map(projects.map((project) => [project.customerId, { id: project.customerId, name: project.customerName }])).values(),
    ).sort((first, second) => first.name.localeCompare(second.name, "hu-HU"));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesCustomer = !selectedCustomerIds.length || selectedCustomerIds.includes(project.customerId);
      const matchesStatus = status === "all" || project.status === status;
      return matchesCustomer && matchesStatus;
    });
  }, [projects, selectedCustomerIds, status]);

  function toggleCustomer(customerId: string) {
    setSelectedCustomerIds((current) =>
      current.includes(customerId)
        ? current.filter((item) => item !== customerId)
        : [...current, customerId],
    );
  }

  const selectedCustomerLabel = selectedCustomerIds.length
    ? `${selectedCustomerIds.length} ügyfél kiválasztva`
    : "Összes ügyfél";

  return (
    <>
      <div className="admin-filters">
        <div className="field">
          <span>Ügyfél neve</span>
          <details className="multiselect-dropdown">
            <summary>
              <span>{selectedCustomerLabel}</span>
              <ChevronDown size={15} />
            </summary>
            <div className="multiselect-menu">
              {customers.map((customer) => {
                const selected = selectedCustomerIds.includes(customer.id);
                return (
                  <button className={`multiselect-menu-item ${selected ? "active" : ""}`} key={customer.id} onClick={() => toggleCustomer(customer.id)} type="button">
                    <span className="multiselect-check">{selected && <Check size={13} />}</span>
                    <span>{customer.name}</span>
                  </button>
                );
              })}
              {selectedCustomerIds.length ? (
                <button className="multiselect-clear" onClick={() => setSelectedCustomerIds([])} type="button">
                  <X size={13} />
                  Szűrő törlése
                </button>
              ) : null}
            </div>
          </details>
        </div>
        <label className="field">
          <span>Státusz</span>
          <select onChange={(event) => setStatus(event.target.value as "all" | ProjectStatus)} value={status}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-table admin-projects-table">
        <div className="admin-table-head admin-projects-table-head">
          <span>Projekt</span>
          <span>Ügyfél</span>
          <span>Státusz</span>
          <span>Telefonszám</span>
          <span>Frissítve</span>
          <span></span>
        </div>
        {filteredProjects.length ? filteredProjects.map((project) => (
          <Link className="admin-table-row admin-table-row-link admin-projects-table-row" href={`/admin/projects/${project.id}?from=projects`} key={project.id}>
            <div className="customer-cell">
              <div className="customer-icon"><FolderKanban size={17} /></div>
              <div>
                <strong>{project.name}</strong>
                <span>{categoryLabels[project.category]} · {project.agentDisplayName}</span>
              </div>
            </div>
            <div className="detail-value">{project.customerName}</div>
            <div className={`status ${project.status}`}><span className="status-dot" />{statusLabels[project.status]}</div>
            <div className="detail-value"><Phone size={14} />{project.phoneNumber ?? "Még nincs hozzárendelve"}</div>
            <div className="detail-value">{project.updatedAt}</div>
            <span className="icon-button" aria-label={`${project.name} admin adatlapja`} title="Projekt adatok"><ChevronRight size={16} /></span>
          </Link>
        )) : (
          <div className="empty-state">Nincs a szűrésnek megfelelő projekt.</div>
        )}
      </div>
    </>
  );
}
