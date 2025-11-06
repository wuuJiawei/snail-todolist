import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { getCheckInHistory, getCheckInStreak, CheckInRecord } from "@/services/checkInService";
import { Icon } from "@/components/ui/icon-park";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";

interface CheckInHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CheckInHistory: React.FC<CheckInHistoryProps> = ({
  open,
  onOpenChange
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<CheckInRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [streak, setStreak] = useState(0);
  const pageSize = 7;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { records, total } = await getCheckInHistory(page, pageSize);
      setRecords(records);
      setTotal(total);

      // Get streak
      const currentStreak = await getCheckInStreak();
      setStreak(currentStreak);
    } catch (error) {
      console.error("Error fetching check-in history:", error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, page, fetchHistory]);

  const totalPages = Math.ceil(total / pageSize);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Icon icon="calendar-thirty" className="mr-2 text-gray-700 dark:text-gray-300" />
            打卡记录
            {streak > 0 && (
              <Badge variant="outline" className="ml-2 bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                连续打卡 {streak} 天
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            查看您的打卡历史记录
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto custom-scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>时间</TableHead>
                <TableHead>备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array(5).fill(0).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                    暂无打卡记录
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => {
                  const date = new Date(record.check_in_time);
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        {format(date, 'yyyy年MM月dd日', { locale: zhCN })}
                      </TableCell>
                      <TableCell>
                        {format(date, 'HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        {record.note || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <Pagination className="mt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(page - 1)}
                  className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                // Show pages around current page
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <PaginationItem key={i}>
                    <PaginationLink
                      onClick={() => handlePageChange(pageNum)}
                      isActive={page === pageNum}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(page + 1)}
                  className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button
            variant="default"
            onClick={() => {
              onOpenChange(false);
              navigate('/checkin-history');
            }}
          >
            查看完整历史
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckInHistory;
