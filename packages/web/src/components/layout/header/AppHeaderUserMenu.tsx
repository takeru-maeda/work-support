import { LogOut, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/getInitials";
import type { UserProfile } from "@/types/userProfile";

interface AppHeaderUserMenuProps {
  userProfile: UserProfile;
  onNavigateProfile: () => void;
  onLogout: () => Promise<void>;
}

export function AppHeaderUserMenu({
  userProfile,
  onNavigateProfile,
  onLogout,
}: Readonly<AppHeaderUserMenuProps>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar className="h-8 w-8">
            {userProfile.avatarUrl && (
              <AvatarImage
                src={userProfile.avatarUrl || "/placeholder-user.svg"}
                alt={userProfile.name}
              />
            )}
            <AvatarFallback className="bg-primary text-primary-foreground">
              {userProfile.name ? (
                getInitials(userProfile.name) || "U"
              ) : (
                <User className="h-4 w-4" />
              )}
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">ユーザーメニュー</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onNavigateProfile}>
          <User className="mr-2 h-4 w-4" />
          プロフィール
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            void onLogout();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          ログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
