import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { env } from "../config/env.js";

export type User = {
  id: string;
  nickname: string;
  normalizedNickname: string;
  passwordHash: string;
  profileImageUrl?: string;
  notificationEnabled?: boolean;
  createdAt: string;
};

type UsersFile = {
  users: User[];
};

const dataDirectory = path.resolve(env.dataDirectory);
const usersFilePath = path.join(dataDirectory, "users.json");

let writeQueue = Promise.resolve();

function normalizeNickname(nickname: string) {
  return nickname.trim().toLocaleLowerCase("ko-KR");
}

async function readUsersFile(): Promise<UsersFile> {
  try {
    const content = await readFile(usersFilePath, "utf8");
    return JSON.parse(content) as UsersFile;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { users: [] };
    }

    throw error;
  }
}

async function writeUsersFile(usersFile: UsersFile) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(usersFilePath, JSON.stringify(usersFile, null, 2), "utf8");
}

function enqueueWrite<T>(operation: () => Promise<T>) {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.then(
    () => undefined,
    () => undefined
  );

  return next;
}

export async function findUserByNickname(nickname: string) {
  const usersFile = await readUsersFile();
  const normalizedNickname = normalizeNickname(nickname);

  return usersFile.users.find((user) => user.normalizedNickname === normalizedNickname) ?? null;
}

export async function findUserById(id: string) {
  const usersFile = await readUsersFile();
  return usersFile.users.find((user) => user.id === id) ?? null;
}

export async function isNicknameTaken(nickname: string) {
  return (await findUserByNickname(nickname)) !== null;
}

export async function createUser(input: { nickname: string; passwordHash: string }) {
  return enqueueWrite(async () => {
    const usersFile = await readUsersFile();
    const nickname = input.nickname.trim();
    const normalizedNickname = normalizeNickname(nickname);

    if (usersFile.users.some((user) => user.normalizedNickname === normalizedNickname)) {
      return null;
    }

    const user: User = {
      id: randomUUID(),
      nickname,
      normalizedNickname,
      passwordHash: input.passwordHash,
      createdAt: new Date().toISOString(),
    };

    usersFile.users.push(user);
    await writeUsersFile(usersFile);

    return user;
  });
}

export async function updateUser(
  userId: string,
  input: {
    nickname?: string;
    profileImageUrl?: string | null;
    notificationEnabled?: boolean;
  }
) {
  return enqueueWrite(async () => {
    const usersFile = await readUsersFile();
    const user = usersFile.users.find((candidate) => candidate.id === userId);

    if (!user) {
      return { status: "not-found" as const };
    }

    if (input.nickname !== undefined) {
      const nickname = input.nickname.trim();
      const normalizedNickname = normalizeNickname(nickname);
      const duplicate = usersFile.users.some(
        (candidate) => candidate.id !== userId && candidate.normalizedNickname === normalizedNickname
      );

      if (duplicate) {
        return { status: "duplicate-nickname" as const };
      }

      user.nickname = nickname;
      user.normalizedNickname = normalizedNickname;
    }

    if (input.profileImageUrl !== undefined) {
      if (input.profileImageUrl === null) {
        delete user.profileImageUrl;
      } else {
        user.profileImageUrl = input.profileImageUrl;
      }
    }

    if (input.notificationEnabled !== undefined) {
      user.notificationEnabled = input.notificationEnabled;
    }

    await writeUsersFile(usersFile);
    return { status: "updated" as const, user };
  });
}

export async function deleteUser(userId: string) {
  return enqueueWrite(async () => {
    const usersFile = await readUsersFile();
    const nextUsers = usersFile.users.filter((user) => user.id !== userId);

    if (nextUsers.length === usersFile.users.length) {
      return false;
    }

    await writeUsersFile({ users: nextUsers });
    return true;
  });
}
