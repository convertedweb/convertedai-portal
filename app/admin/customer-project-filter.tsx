"use client";

import { useState } from "react";

type Customer = { id: string; name: string };
type Project = { customerId: string; id: string; name: string };

// Összekapcsolt ügyfél/projekt szűrő: a projektlista az ügyfélre szűkül, a projekt választása beállítja az ügyfelet.
export function CustomerProjectFilter({ customers, defaultCustomer = "", defaultProject = "", labeled = false, projects }: {
  customers: Customer[];
  defaultCustomer?: string;
  defaultProject?: string;
  labeled?: boolean;
  projects: Project[];
}) {
  const [project, setProject] = useState(defaultProject);
  const [customer, setCustomer] = useState(() => defaultCustomer || projects.find((item) => item.id === defaultProject)?.customerId || "");
  const selectedProject = projects.find((item) => item.id === project);
  const visibleCustomers = selectedProject ? customers.filter((item) => item.id === selectedProject.customerId) : customers;
  const visibleProjects = customer ? projects.filter((item) => item.customerId === customer) : projects;
  const customerName = new Map(customers.map((item) => [item.id, item.name]));

  const customerSelect = (
    <select aria-label="Ügyfél" name="customer" onChange={(event) => {
      setCustomer(event.target.value);
      setProject("");
    }} value={customer}>
      <option value="">Minden ügyfél</option>
      {visibleCustomers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
  );
  const projectSelect = (
    <select aria-label="Projekt" name="project" onChange={(event) => {
      const next = projects.find((item) => item.id === event.target.value);
      setProject(event.target.value);
      if (next) setCustomer(next.customerId);
    }} value={project}>
      <option value="">Minden projekt</option>
      {visibleProjects.map((item) => <option key={item.id} value={item.id}>{customer ? item.name : `${customerName.get(item.customerId) ?? ""} · ${item.name}`}</option>)}
    </select>
  );

  return labeled
    ? <><label><span>Ügyfél</span>{customerSelect}</label><label><span>Projekt</span>{projectSelect}</label></>
    : <>{customerSelect}{projectSelect}</>;
}
