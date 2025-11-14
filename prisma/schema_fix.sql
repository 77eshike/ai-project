-- 首先删除外键约束
ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_userId_fkey";

-- 修改 userId 字段类型
ALTER TABLE "Session" ALTER COLUMN "userId" TYPE VARCHAR(255);

-- 重新添加外键约束
ALTER TABLE "Session" 
ADD CONSTRAINT "Session_userId_fkey" 
FOREIGN KEY ("userId") 
REFERENCES "User"("id") 
ON DELETE CASCADE;
