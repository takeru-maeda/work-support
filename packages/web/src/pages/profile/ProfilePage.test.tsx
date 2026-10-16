import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ENDPOINTS } from "@/config/api";
import { logout, updateProfile } from "@/lib/auth";
import type * as Auth from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";
import { deleteAvatarImage, uploadAvatarImage } from "@/lib/storage";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useUserStore } from "@/store/user";
import { renderWithProviders } from "@/test/render";
import { apiUrl, server } from "@/test/server";

import ProfilePage from "./ProfilePage";

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof Auth>()),
  getAccessToken: async () => null,
  updateProfile: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  uploadAvatarImage: vi.fn(),
  deleteAvatarImage: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

const USER_ID = "00000000-0000-4000-8000-000000000001";
const AVATAR_BASE = "http://supabase.test/storage/v1/object/public/avatars";

const USER: AuthUser = {
  id: USER_ID,
  name: "Taro Yamada",
  email: "taro@example.com",
};

const LocationProbe = () => {
  const location = useLocation();
  return <p data-testid="location">{location.pathname}</p>;
};

const renderPage = () =>
  renderWithProviders(
    <MemoryRouter initialEntries={["/profile"]}>
      <Routes>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<p>ほかの画面</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );

const location = () => screen.getByTestId("location").textContent;
const avatarButton = () =>
  screen.getByRole("button", { name: "プロフィール画像を変更" });
const fileInput = () =>
  document.querySelector('input[type="file"]') as HTMLInputElement;

/** 名前の更新が成功したことにする（返すユーザーは送った内容を反映したもの） */
const updateSucceeds = () =>
  vi.mocked(updateProfile).mockImplementation(async (updates) => ({
    success: true,
    user: {
      ...(useUserStore.getState().user as AuthUser),
      ...(updates.name === undefined ? {} : { name: updates.name }),
      ...(updates.avatarUrl === undefined
        ? {}
        : { avatarUrl: updates.avatarUrl }),
    },
  }));

const mockDeleteApi = (status: number) => {
  const log = { deletes: 0, errorLogs: 0 };
  server.use(
    http.delete(apiUrl(API_ENDPOINTS.userAccount), () => {
      log.deletes += 1;
      return new HttpResponse(null, { status });
    }),
    http.post(apiUrl(API_ENDPOINTS.errorLogs), () => {
      log.errorLogs += 1;
      return HttpResponse.json(
        { id: 1, recordedAt: "2026-10-13T00:00:00Z" },
        { status: 201 },
      );
    }),
  );
  return log;
};

beforeEach(() => {
  useUserStore.getState().setUser(USER);
  vi.mocked(updateProfile).mockReset();
  vi.mocked(logout).mockReset();
  vi.mocked(uploadAvatarImage).mockReset();
  vi.mocked(deleteAvatarImage).mockReset();
  vi.mocked(showErrorToast).mockClear();
  vi.mocked(showSuccessToast).mockClear();
});

describe("ProfilePage（プロフィール）", () => {
  describe("表示", () => {
    it("AC-profile-09: 画像のボタン（画像が無ければ頭文字）、見出し、メールアドレス、ユーザー名、アカウント削除のカードを出す", () => {
      renderPage();

      expect(avatarButton()).toHaveTextContent("TY");
      expect(screen.getByText("アカウント情報を管理")).toBeInTheDocument();
      expect(screen.getByText("taro@example.com")).toBeInTheDocument();
      expect(screen.getByText("Taro Yamada")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "アカウントを削除する" }),
      ).toBeInTheDocument();
    });

    it("AC-profile-09: 頭文字は入力中の名前から作り、空にすると人の印になる", async () => {
      const ui = userEvent.setup();
      renderPage();

      await ui.click(screen.getByRole("button", { name: "編集" }));
      const input = screen.getByPlaceholderText("山田 太郎");
      await ui.clear(input);
      await ui.type(input, "hanako");
      expect(avatarButton()).toHaveTextContent("HA");

      await ui.clear(input);
      expect(avatarButton().textContent).toBe("");
    });
  });

  describe("ユーザー名", () => {
    it("AC-profile-10: 入力のまま（前後の空白も）保存し、ストアを更新して「プロフィールを更新しました」", async () => {
      updateSucceeds();
      const ui = userEvent.setup();
      renderPage();

      await ui.click(screen.getByRole("button", { name: "編集" }));
      const input = screen.getByPlaceholderText("山田 太郎");
      await ui.clear(input);
      await ui.type(input, " 新しい 名前 ");
      await ui.click(screen.getByRole("button", { name: "保存" }));

      await waitFor(() =>
        expect(showSuccessToast).toHaveBeenCalledWith(
          "プロフィールを更新しました",
        ),
      );
      expect(updateProfile).toHaveBeenCalledWith({ name: " 新しい 名前 " });
      expect(useUserStore.getState().user?.name).toBe(" 新しい 名前 ");
      expect(
        screen.queryByPlaceholderText("山田 太郎"),
      ).not.toBeInTheDocument();
    });

    it("AC-profile-10: 失敗したら「プロフィールの更新に失敗しました」（説明にエラーの文）を出し、編集を続ける", async () => {
      vi.mocked(updateProfile).mockResolvedValue({
        success: false,
        user: null,
        error: "network error",
      });
      const ui = userEvent.setup();
      renderPage();

      await ui.click(screen.getByRole("button", { name: "編集" }));
      await ui.type(screen.getByPlaceholderText("山田 太郎"), "!");
      await ui.click(screen.getByRole("button", { name: "保存" }));

      await waitFor(() =>
        expect(showErrorToast).toHaveBeenCalledWith(
          "プロフィールの更新に失敗しました",
          { description: "network error" },
        ),
      );
      expect(screen.getByPlaceholderText("山田 太郎")).toHaveValue(
        "Taro Yamada!",
      );
    });

    it("AC-profile-10: 「キャンセル」でストアの値に戻す", async () => {
      const ui = userEvent.setup();
      renderPage();

      await ui.click(screen.getByRole("button", { name: "編集" }));
      await ui.type(screen.getByPlaceholderText("山田 太郎"), "!");
      await ui.click(screen.getByRole("button", { name: "キャンセル" }));

      expect(screen.getByText("Taro Yamada")).toBeInTheDocument();
      expect(updateProfile).not.toHaveBeenCalled();
    });
  });

  describe("プロフィール画像", () => {
    const pick = async (ui: ReturnType<typeof userEvent.setup>, file: File) => {
      await ui.upload(fileInput(), file);
    };

    it("AC-profile-11: 画像でなければ「画像ファイルを選択してください」で何もしない", async () => {
      const ui = userEvent.setup({ applyAccept: false });
      renderPage();

      await pick(ui, new File(["x"], "memo.txt", { type: "text/plain" }));

      expect(showErrorToast).toHaveBeenCalledWith(
        "画像ファイルを選択してください",
      );
      expect(uploadAvatarImage).not.toHaveBeenCalled();
    });

    it("AC-profile-11: 画像をアップロードし、?t= 付きの公開 URL を保存して「プロフィール画像を更新しました」。拡張子が変わったら前の画像を消す", async () => {
      useUserStore.getState().setUser({
        ...USER,
        avatarUrl: `${AVATAR_BASE}/${USER_ID}/avatar.png?t=1`,
      });
      vi.mocked(uploadAvatarImage).mockResolvedValue({
        publicUrl: `${AVATAR_BASE}/${USER_ID}/avatar.jpg`,
        objectPath: `${USER_ID}/avatar.jpg`,
      });
      updateSucceeds();
      const ui = userEvent.setup();
      renderPage();

      await pick(ui, new File(["x"], "photo.JPG", { type: "image/jpeg" }));

      await waitFor(() =>
        expect(showSuccessToast).toHaveBeenCalledWith(
          "プロフィール画像を更新しました",
        ),
      );
      expect(uploadAvatarImage).toHaveBeenCalledWith(USER_ID, expect.any(File));
      expect(updateProfile).toHaveBeenCalledWith({
        avatarUrl: expect.stringMatching(
          new RegExp(`^${AVATAR_BASE}/${USER_ID}/avatar\\.jpg\\?t=\\d+$`),
        ),
      });
      await waitFor(() =>
        expect(deleteAvatarImage).toHaveBeenCalledWith(`${USER_ID}/avatar.png`),
      );
    });

    it("AC-profile-11: 拡張子が同じなら前の画像は消さない", async () => {
      useUserStore.getState().setUser({
        ...USER,
        avatarUrl: `${AVATAR_BASE}/${USER_ID}/avatar.png?t=1`,
      });
      vi.mocked(uploadAvatarImage).mockResolvedValue({
        publicUrl: `${AVATAR_BASE}/${USER_ID}/avatar.png`,
        objectPath: `${USER_ID}/avatar.png`,
      });
      updateSucceeds();
      const ui = userEvent.setup();
      renderPage();

      await pick(ui, new File(["x"], "photo.png", { type: "image/png" }));

      await waitFor(() => expect(showSuccessToast).toHaveBeenCalled());
      expect(deleteAvatarImage).not.toHaveBeenCalled();
    });
  });

  describe("アカウントの削除", () => {
    const openDialog = async (ui: ReturnType<typeof userEvent.setup>) => {
      await ui.click(
        screen.getByRole("button", { name: "アカウントを削除する" }),
      );
      return screen.findByRole("alertdialog");
    };

    it("AC-profile-12: メールアドレスと完全に一致したときだけ「削除する」を押せ、閉じると入力を消す", async () => {
      const ui = userEvent.setup();
      renderPage();

      const dialog = await openDialog(ui);
      expect(dialog).toHaveTextContent("本当にアカウントを削除しますか？");
      const input = within(dialog).getByPlaceholderText("taro@example.com");
      const confirm = within(dialog).getByRole("button", { name: "削除する" });

      await ui.type(input, "TARO@example.com");
      expect(confirm).toBeDisabled();
      await ui.clear(input);
      await ui.type(input, "taro@example.com");
      expect(confirm).toBeEnabled();

      await ui.click(
        within(dialog).getByRole("button", { name: "キャンセル" }),
      );
      const reopened = await openDialog(ui);
      expect(
        within(reopened).getByPlaceholderText("taro@example.com"),
      ).toHaveValue("");
    });

    it("AC-profile-13: 「削除する」で DELETE /api/users/me を送り、成功したらログアウトして /login に移る", async () => {
      const log = mockDeleteApi(204);
      vi.mocked(logout).mockResolvedValue({ success: true });
      const ui = userEvent.setup();
      renderPage();

      const dialog = await openDialog(ui);
      await ui.type(
        within(dialog).getByPlaceholderText("taro@example.com"),
        "taro@example.com",
      );
      await ui.click(within(dialog).getByRole("button", { name: "削除する" }));

      await waitFor(() => expect(location()).toBe("/login"));
      expect(log.deletes).toBe(1);
      expect(logout).toHaveBeenCalledTimes(1);
      expect(showSuccessToast).toHaveBeenCalledWith(
        "アカウントを削除しました。",
      );
    });

    it("AC-profile-13: 失敗したら「アカウントの削除に失敗しました。」を出し、error_logs に送る", async () => {
      const log = mockDeleteApi(500);
      const ui = userEvent.setup();
      renderPage();

      const dialog = await openDialog(ui);
      await ui.type(
        within(dialog).getByPlaceholderText("taro@example.com"),
        "taro@example.com",
      );
      await ui.click(within(dialog).getByRole("button", { name: "削除する" }));

      await waitFor(() =>
        expect(showErrorToast).toHaveBeenCalledWith(
          "アカウントの削除に失敗しました。",
        ),
      );
      await waitFor(() => expect(log.errorLogs).toBe(1));
      expect(logout).not.toHaveBeenCalled();
      expect(location()).toBe("/profile");
    });
  });
});
