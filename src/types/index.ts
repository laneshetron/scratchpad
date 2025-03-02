export interface EditorProps {}

export interface TooltipProps {
  x: number;
  y: number;
  visible: boolean;
  content: string;
}

export interface NoteTab {
  id: string;
  title: string;
  filePath: string | undefined;
  content: string;
  name: string;
  modified: Date;
}
