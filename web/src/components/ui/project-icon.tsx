import React from "react";
import { Icon } from "@/components/ui/icon-park";
// Keep lucide-react as fallback for backward compatibility
import { Folder, Calendar, CalendarDays } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface ProjectIconProps {
  icon?: string;
  color?: string;
  size?: number;
  className?: string;
}

// 检查字符串是否包含emoji
const isEmoji = (str: string): boolean => {
  // 更现代和准确的emoji检测：支持最新的Unicode emoji
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff]/gu;
  
  // 如果Unicode property不支持，使用传统的范围检测
  try {
    return emojiRegex.test(str);
  } catch (error) {
    // 回退到传统的emoji检测
    const fallbackRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F910}-\u{1F96B}]|[\u{1F980}-\u{1F997}]|[\u{1F9C0}-\u{1F9C2}]|[\u{1F9D0}-\u{1F9FF}]/gu;
    return fallbackRegex.test(str);
  }
};

const ProjectIcon: React.FC<ProjectIconProps> = ({
  icon,
  color = "#000000",
  size = 24,
  className = "",
}) => {
  // 如果图标是emoji，直接显示emoji
  if (icon && isEmoji(icon)) {
    return (
      <span
        className={`${className} inline-flex items-center justify-center`}
        style={{
          fontSize: `${size}px`,
          lineHeight: 1,
          width: `${size}px`,
          height: `${size}px`,
          verticalAlign: 'middle',
          fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
        }}
      >
        {icon}
      </span>
    );
  }

  // Convert kebab-case to PascalCase for Lucide icons
  const toPascalCase = (str: string) => {
    return str
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  };

  // Try to use IconPark first
  try {
    // Map icon values to their IconPark equivalents
    const iconMapping: Record<string, string> = {
      // 基础
      'folder': 'folder-one',
      'home': 'home',
      'user': 'user',
      'setting': 'setting-two',
      'search': 'search',
      'heart': 'like',
      'star': 'star',
      'bookmark': 'bookmark',
      'inbox': 'inbox',
      'archive': 'file-cabinet',
      
      // 时间
      'calendar': 'calendar',
      'calendar-days': 'calendar-thirty',
      'clock': 'time',
      'alarm': 'alarm-clock',
      'history': 'history',
      'stopwatch': 'stopwatch',
      'schedule': 'schedule',
      'reminder': 'remind',
      
      // 工作
      'briefcase': 'handbag',
      'target': 'target',
      'chart': 'chart-line',
      'task': 'check-one',
      'project': 'application',
      'document': 'doc-detail',
      'pencil': 'edit',
      'pin': 'local-pin',
      'flag': 'flag',
      'trophy': 'trophy',
      
      // 生活
      'coffee': 'coffee',
      'book': 'book-open',
      'music': 'music',
      'camera': 'camera',
      'game': 'game-three',
      'gift': 'gift',
      'shopping': 'shopping',
      'pizza': 'hamburger',
      'movie': 'movie',
      'party': 'party-balloon',
      
      // 健康
      'heart-health': 'heart',
      'fitness': 'sport',
      'medical': 'medical-files',
      'pills': 'pills',
      'brain': 'brain',
      'sleep': 'sleep',
      'yoga': 'yoga',
      'running': 'sport',
      
      // 旅行
      'plane': 'airplane',
      'car': 'car',
      'map': 'local',
      'compass': 'compass',
      'suitcase': 'suitcase',
      'hotel': 'hotel-please-clean',
      'train': 'train',
      'ship': 'ship',
      
      // 学习
      'graduation': 'degree-hat',
      'school': 'school',
      'lightbulb': 'lightbulb',
      'experiment': 'experiment',
      'calculator': 'calculator',
      'lab': 'chemical',
      'library': 'library',
      'notebook': 'notebook',
      
      // 科技
      'laptop': 'laptop-computer',
      'phone': 'phone',
      'code': 'code',
      'database': 'database',
      'server': 'server',
      'robot': 'robot-one',
      'rocket': 'rocket-one',
      'chip': 'chip',
      'wifi': 'wifi',
      'cloud': 'cloud',
      
      // 沟通
      'message': 'message',
      'mail': 'mail',
      'phone-call': 'phone-call',
      'team': 'people',
      'megaphone': 'volume-notice',
      'chat': 'comment',
      'video': 'video',
      'microphone': 'microphone',
      
      // 向后兼容 - 系统固定清单使用的图标
      'check-square': 'check-one',
      'hamburger': 'hamburger-button',
      'hand-wave': 'hi',
      'close-one': 'close-one',
      'recycling-pool': 'recycling-pool',
    };

    const iconParkName = iconMapping[icon || 'folder'] || icon || 'folder-one';

    return (
      <Icon
        icon={iconParkName}
        size={size}
        fill={color}
        className={className}
      />
    );
  } catch (error) {
    // Fallback to Lucide icons for backward compatibility
    if (!icon) {
      return <Folder className={className} width={size} height={size} style={{ color }} />;
    }

    // Special handling for predefined icons
    if (icon === 'calendar') {
      return <Calendar className={className} width={size} height={size} style={{ color }} />;
    }

    if (icon === 'calendar-days') {
      return <CalendarDays className={className} width={size} height={size} style={{ color }} />;
    }

    // Try to find the icon in lucide-react
    const pascalCaseName = toPascalCase(icon);
    const IconComponent = (LucideIcons as Record<string, unknown>)[pascalCaseName] as React.ComponentType<{
      className?: string;
      width?: number;
      height?: number;
      style?: React.CSSProperties;
    }> | undefined;

    if (IconComponent) {
      return <IconComponent className={className} width={size} height={size} style={{ color }} />;
    }

    // Fallback to Folder icon
    return <Folder className={className} width={size} height={size} style={{ color }} />;
  }
};

export default ProjectIcon;
