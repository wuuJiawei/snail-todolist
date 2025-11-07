import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export type CheckInRecord = {
  id?: string;
  user_id?: string;
  check_in_time?: string;
  note?: string;
  created_at?: string;
};

const getTodayBounds = () => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  return {
    startIso: startOfDay.toISOString(),
    endIso: endOfDay.toISOString(),
  };
};

// Check if user has already checked in today
export const hasCheckedInToday = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { startIso, endIso } = getTodayBounds();

    const { data, error } = await supabase
      .from('checkin_records')
      .select('id')
      .eq('user_id', user.id)
      .gte('check_in_time', startIso)
      .lte('check_in_time', endIso);

    if (error) {
      console.error("Error checking daily check-in status:", error);
      return false;
    }

    return Array.isArray(data) && data.length > 0;
  } catch (error) {
    console.error("Error checking if user has checked in today:", error);
    return false;
  }
};

// Create a new check-in record
export const createCheckIn = async (note?: string): Promise<boolean> => {
  try {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "未登录",
        description: "请先登录后再打卡",
        variant: "destructive",
      });
      return false;
    }

    if (await hasCheckedInToday()) {
      toast({
        title: "已经打过卡了",
        description: "今天已经打过卡了，明天再来吧！",
        variant: "default",
      });
      return false;
    }

    // Get current date and time in ISO format
    const now = new Date();

    const { error } = await supabase
      .from("checkin_records")
      .insert({
        user_id: user.id,
        check_in_time: now.toISOString(),
        note: note || null,
      });

    if (error) {
      throw error;
    }

    toast({
      title: "打卡成功",
      description: "今天又是充满活力的一天！",
      variant: "default",
    });

    return true;
  } catch (error) {
    console.error("Error creating check-in record:", error);
    toast({
      title: "打卡失败",
      description: "请稍后再试",
      variant: "destructive",
    });
    return false;
  }
};

// Get check-in history with pagination
export const getCheckInHistory = async (
  page: number = 1,
  pageSize: number = 10
): Promise<{ records: CheckInRecord[]; total: number }> => {
  try {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { records: [], total: 0 };
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from("checkin_records")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      throw countError;
    }

    // Get paginated records
    const { data, error } = await supabase
      .from("checkin_records")
      .select("*")
      .eq("user_id", user.id)
      .order("check_in_time", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      throw error;
    }

    return {
      records: data || [],
      total: count || 0,
    };
  } catch (error) {
    console.error("Error fetching check-in history:", error);
    return {
      records: [],
      total: 0,
    };
  }
};

// Get check-in streak (consecutive days)
export const getCheckInStreak = async (): Promise<number> => {
  try {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    // Query all check-in dates for the user
    const { data, error } = await supabase
      .from("checkin_records")
      .select("check_in_time")
      .eq("user_id", user.id)
      .order("check_in_time", { ascending: false });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return 0;
    }

    let streak = 1;

    // Extract dates from check-in times and get unique dates
    const uniqueDates = new Set();
    data.forEach(record => {
      // Convert to local date string in YYYY-MM-DD format
      const date = new Date(record.check_in_time);
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day = String(localDate.getDate()).padStart(2, '0');
      uniqueDates.add(`${year}-${month}-${day}`);
    });


    // Convert to Date objects and sort
    const dates = Array.from(uniqueDates).map(dateStr => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, (m ?? 1) - 1, d);
    });
    dates.sort((a, b) => b.getTime() - a.getTime());

    // Get today's date in local timezone
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const today = new Date(year, month, day, 0, 0, 0, 0);


    // If the most recent check-in is not today or yesterday, streak is 0
    const mostRecent = dates[0];
    const dayDiff = Math.floor((today.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));

    if (dayDiff > 1) {
      return 0;
    }

    // Count consecutive days
    for (let i = 0; i < dates.length - 1; i++) {
      const current = dates[i];
      const next = dates[i + 1];

      const diffDays = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error("Error calculating check-in streak:", error);
    return 0;
  }
};
