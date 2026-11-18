import { format, parseISO } from "date-fns";

export const formatDateNoTime = (date: string) => {
  return format(parseISO(date), "MM/dd/yyyy");
};
