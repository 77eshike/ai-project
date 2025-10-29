const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Testing database operations...')
  
  try {
    // 创建用户
    const newUser = await prisma.user.create({
      data: {
        email: 'test2@example.com',
        name: 'Test User 2',
      },
    })
    console.log('Created user:', newUser)
    
    // 查询用户
    const users = await prisma.user.findMany()
    console.log('All users:', users)
    
    // 更新用户
    const updatedUser = await prisma.user.update({
      where: { id: newUser.id },
      data: { name: 'Updated Test User' },
    })
    console.log('Updated user:', updatedUser)
    
    // 删除用户
    const deletedUser = await prisma.user.delete({
      where: { id: newUser.id },
    })
    console.log('Deleted user:', deletedUser)
    
    console.log('All database operations successful!')
  } catch (error) {
    console.error('Database operation error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
