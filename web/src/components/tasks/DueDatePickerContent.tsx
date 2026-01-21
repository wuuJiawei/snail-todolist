import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { addDays, subDays } from "date-fns";
import { zhCN } from "date-fns/locale";

interface DueDatePickerContentProps {
  selectedDate?: Date;
  onChange: (date: Date | undefined) => void;
  removeLabel?: string;
  className?: string;
}

const DueDatePickerContent: React.FC<DueDatePickerContentProps> = ({
  selectedDate,
  onChange,
  removeLabel = "移除截止日期",
  className,
}) => {
  return (
    <div className={className}>
      <div className="p-2 flex flex-row gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(new Date())}
          className="justify-start"
        >
          今天
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(addDays(new Date(), 1))}
          className="justify-start"
        >
          明天
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(subDays(new Date(), 1))}
          className="justify-start"
        >
          昨天
        </Button>
        {selectedDate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(undefined)}
            className="justify-start text-red-500 hover:text-red-600"
          >
            {removeLabel}
          </Button>
        )}
      </div>
      <CalendarComponent
        mode="single"
        selected={selectedDate}
        onSelect={(d) => onChange(d as Date | undefined)}
        className="rounded-md border"
        locale={zhCN}
      />
    </div>
  );
};

export default DueDatePickerContent;


