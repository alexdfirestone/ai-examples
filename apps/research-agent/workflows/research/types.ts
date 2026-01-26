// Data parts that stream progress to the UI

export interface ResearchProgressDataPart {
  type: "data-research-progress";
  id: string;
  data: {
    query: string;
    status: "searching" | "found" | "complete";
    resultCount?: number;
  };
}

export interface OutlineDataPart {
  type: "data-outline";
  id: string;
  data: {
    sections: Array<{
      title: string;
      description: string;
    }>;
  };
}

export interface ApprovalRequestDataPart {
  type: "data-approval-request";
  id: string;
  data: {
    message: string;
    webhookUrl: string;
  };
}

export interface SectionProgressDataPart {
  type: "data-section-progress";
  id: string;
  data: {
    sectionTitle: string;
    status: "writing" | "complete";
    content?: string;
  };
}

export interface ReportCompleteDataPart {
  type: "data-report-complete";
  id: string;
  data: {
    title: string;
    fullReport: string;
    wordCount: number;
  };
}

export type CustomDataPart =
  | ResearchProgressDataPart
  | OutlineDataPart
  | ApprovalRequestDataPart
  | SectionProgressDataPart
  | ReportCompleteDataPart;
