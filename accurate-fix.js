// 准确修复 - 基于实际数据库表结构
console.log('🎯 加载准确类型修复...');

const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  let module = originalRequire.apply(this, arguments);
  
  if (id.includes('@prisma/client') && module.PrismaClient) {
    console.log('🔧 修补 Prisma 客户端以处理实际数据库表...');
    
    const OriginalPrismaClient = module.PrismaClient;
    
    class AccuratePrismaClient extends OriginalPrismaClient {
      constructor(options) {
        super(options);
        this.patchForAccurateTables();
      }
      
      patchForAccurateTables() {
        // 重点修补 project 相关查询
        if (this.project) {
          this.patchProjectModel();
        }
        
        // 修补 user 相关查询（如果需要）
        if (this.user) {
          this.patchUserModel();
        }
      }
      
      patchProjectModel() {
        console.log('📁 修补 Project 模型方法...');
        
        const methods = ['findMany', 'findFirst', 'findUnique', 'count'];
        
        methods.forEach(method => {
          if (typeof this.project[method] === 'function') {
            const originalMethod = this.project[method];
            this.project[method] = (params) => {
              console.log(`🔍 Project.${method} 被调用`, params ? '有参数' : '无参数');
              
              if (params && params.where) {
                // 修复 ownerId 类型问题
                if (params.where.ownerId && typeof params.where.ownerId === 'number') {
                  console.log(`🔧 转换 ownerId: ${params.where.ownerId} -> "${params.where.ownerId.toString()}"`);
                  params.where.ownerId = params.where.ownerId.toString();
                }
                
                // 修复 OR 条件中的类型问题
                if (params.where.OR && Array.isArray(params.where.OR)) {
                  params.where.OR = params.where.OR.map(condition => {
                    if (condition && condition.ownerId && typeof condition.ownerId === 'number') {
                      console.log(`🔧 转换 OR.ownerId: ${condition.ownerId} -> "${condition.ownerId.toString()}"`);
                      condition.ownerId = condition.ownerId.toString();
                    }
                    if (condition && condition.projectMembers && condition.projectMembers.some) {
                      if (condition.projectMembers.some.userId && typeof condition.projectMembers.some.userId === 'number') {
                        console.log(`🔧 转换 projectMembers.userId: ${condition.projectMembers.some.userId} -> "${condition.projectMembers.some.userId.toString()}"`);
                        condition.projectMembers.some.userId = condition.projectMembers.some.userId.toString();
                      }
                    }
                    return condition;
                  });
                }
              }
              
              return originalMethod.call(this.project, params);
            };
          }
        });
      }
      
      patchUserModel() {
        console.log('👤 修补 User 模型方法...');
        
        const methods = ['findMany', 'findFirst', 'findUnique'];
        
        methods.forEach(method => {
          if (typeof this.user[method] === 'function') {
            const originalMethod = this.user[method];
            this.user[method] = (params) => {
              if (params && params.where) {
                // 修复 user ID 类型问题
                if (params.where.id && typeof params.where.id === 'number') {
                  console.log(`🔧 转换 user.id: ${params.where.id} -> "${params.where.id.toString()}"`);
                  params.where.id = params.where.id.toString();
                }
              }
              return originalMethod.call(this.user, params);
            };
          }
        });
      }
    }
    
    module.PrismaClient = AccuratePrismaClient;
    console.log('✅ Prisma 客户端修补完成');
  }
  
  return module;
};

console.log('🚀 准确类型修复已加载');
