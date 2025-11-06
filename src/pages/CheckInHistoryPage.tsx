import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
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
import { Calendar } from "@/components/ui/calendar";

const CheckInHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<CheckInRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [streak, setStreak] = useState(0);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const pageSize = 10;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { records, total } = await getCheckInHistory(page, pageSize);
      setRecords(records);
      setTotal(total);

      // Get streak
      const currentStreak = await getCheckInStreak();
      setStreak(currentStreak);

      // Extract dates for calendar
      const dates = records.map(record => new Date(record.check_in_time));
      setSelectedDates(dates);
    } catch (error) {
      console.error("Error fetching check-in history:", error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchHistory();
  }, [page, fetchHistory]);

  const totalPages = Math.ceil(total / pageSize);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/')}
            className="h-8 w-8 rounded-full"
          >
            <Icon icon="left" size={16} />
          </Button>
          <h1 className="text-3xl font-bold">打卡记录</h1>
        </div>
        {streak > 0 && (
          <Badge variant="outline" className="px-3 py-1 text-base bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            <Icon icon="fire" className="mr-1" />
            连续打卡 {streak} 天
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>打卡历史</CardTitle>
            <CardDescription>查看您的所有打卡记录</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>打卡日历</CardTitle>
            <CardDescription>查看您的打卡日期</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="multiple"
              selected={selectedDates}
              className="rounded-md border"
              disabled={true} // Make it read-only
            />

            <div className="mt-4 text-sm text-gray-500">
              <p>总打卡次数: {total} 次</p>
              {streak > 0 && <p>当前连续打卡: {streak} 天</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckInHistoryPage;
