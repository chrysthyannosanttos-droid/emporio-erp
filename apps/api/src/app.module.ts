import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { CompaniesModule } from './companies/companies.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { ReceivingModule } from './receiving/receiving.module';
import { AuthModule } from './auth/auth.module';
import { CrmModule } from './crm/crm.module';
import { MarketingModule } from './marketing/marketing.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [PrismaModule, ProductsModule, CompaniesModule, UsersModule, CustomersModule, SuppliersModule, PurchaseOrdersModule, ReceivingModule, AuthModule, CrmModule, MarketingModule, SyncModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
