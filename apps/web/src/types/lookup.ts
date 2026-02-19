export interface AccessibleUnit {
  id: string;
  code: string;
  name: string;
}

export interface AccessibleClassroom {
  id: string;
  code: string;
  name: string;
  unitId: string;
}

export interface AccessibleTeacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface PlanningTemplateSection {
  title: string;
  fields: string[];
}

export interface PlanningTemplateCocris {
  id: string;
  name: string;
  description: string;
  type: string;
  sections: PlanningTemplateSection[];
  isActive: boolean;
}
