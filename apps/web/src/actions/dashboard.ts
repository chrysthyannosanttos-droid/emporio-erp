"use server";

import { prisma } from "@emporio/database";

export async function getStoreRanking(month: number, year: number) {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Get all sales for the month
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
        status: "COMPLETED",
      },
      include: {
        company: true,
      },
    });

    const companyMap = new Map<string, { id: string; name: string; total: number }>();

    sales.forEach((sale) => {
      const companyId = sale.companyId;
      const total = Number(sale.total);
      
      if (!companyMap.has(companyId)) {
        companyMap.set(companyId, {
          id: sale.company.id,
          name: sale.company.name,
          total: 0,
        });
      }
      
      const current = companyMap.get(companyId)!;
      current.total += total;
    });

    const ranking = Array.from(companyMap.values()).sort((a, b) => b.total - a.total);

    return { ranking };
  } catch (err: any) {
    return { error: err.message, ranking: [] };
  }
}

export async function getCategoryMix(month: number, year: number) {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // We need to fetch SaleItems within the given period to compute the mix
    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          createdAt: {
            gte: startDate,
            lt: endDate,
          },
          status: "COMPLETED",
        },
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    if (saleItems.length === 0) {
      return { mix: [] };
    }

    let totalSales = 0;
    const categoryMap = new Map<string, { name: string; total: number }>();

    saleItems.forEach((item) => {
      const itemTotal = Number(item.total);
      totalSales += itemTotal;

      const categoryName = item.product.category?.name || "Sem Categoria";
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, { name: categoryName, total: 0 });
      }
      
      const current = categoryMap.get(categoryName)!;
      current.total += itemTotal;
    });

    const mix = Array.from(categoryMap.values())
      .map(cat => ({
        name: cat.name,
        total: cat.total,
        percentage: totalSales > 0 ? (cat.total / totalSales) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return { mix, totalSales };
  } catch (err: any) {
    return { error: err.message, mix: [] };
  }
}

export async function getDashboardStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    // Sales this month
    const thisMonthSales = await prisma.sale.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: firstDayOfMonth }, status: "COMPLETED" }
    });

    // Sales last month for trend
    const lastMonthSales = await prisma.sale.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: firstDayOfLastMonth, lt: firstDayOfMonth }, status: "COMPLETED" }
    });

    const faturamentoMensal = Number(thisMonthSales._sum.total || 0);
    const faturamentoMensalAnterior = Number(lastMonthSales._sum.total || 0);
    const faturamentoTrend = faturamentoMensalAnterior > 0 
      ? ((faturamentoMensal - faturamentoMensalAnterior) / faturamentoMensalAnterior) * 100 
      : 0;

    // Sales Today vs Yesterday
    const salesToday = await prisma.sale.count({
      where: { createdAt: { gte: today }, status: "COMPLETED" }
    });
    const salesYesterday = await prisma.sale.count({
      where: { createdAt: { gte: yesterday, lt: today }, status: "COMPLETED" }
    });
    const salesTrend = salesYesterday > 0 
      ? ((salesToday - salesYesterday) / salesYesterday) * 100 
      : 0;

    // Customers this month
    const newCustomers = await prisma.customer.count({
      where: { createdAt: { gte: firstDayOfMonth } }
    });
    const oldCustomers = await prisma.customer.count({
      where: { createdAt: { gte: firstDayOfLastMonth, lt: firstDayOfMonth } }
    });
    const customersTrend = oldCustomers > 0 
      ? ((newCustomers - oldCustomers) / oldCustomers) * 100 
      : 0;

    // Low stock
    const lowStock = await prisma.product.count({
      where: { stock: { lte: 5 } }
    });

    return {
      stats: {
        faturamento: faturamentoMensal,
        faturamentoTrend,
        vendasHoje: salesToday,
        vendasTrend: salesTrend,
        novosClientes: newCustomers,
        clientesTrend: customersTrend,
        estoqueBaixo: lowStock
      }
    };
  } catch (err: any) {
    return { 
      error: err.message,
      stats: {
        faturamento: 0,
        faturamentoTrend: 0,
        vendasHoje: 0,
        vendasTrend: 0,
        novosClientes: 0,
        clientesTrend: 0,
        estoqueBaixo: 0
      }
    };
  }
}

export async function getSalesChartData(days = 7) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days + 1);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startDate },
        status: "COMPLETED"
      },
      select: { total: true, createdAt: true }
    });

    const dailyMap = new Map<string, number>();
    
    // Initialize map with 0s for all days
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dailyMap.set(d.toISOString().split('T')[0], 0);
    }

    sales.forEach(sale => {
      const dateKey = sale.createdAt.toISOString().split('T')[0];
      if (dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, dailyMap.get(dateKey)! + Number(sale.total));
      }
    });

    const chartData = Array.from(dailyMap.values());
    const maxSale = Math.max(...chartData, 1);
    const normalizedData = chartData.map(val => (val / maxSale) * 100);

    return { chartData, normalizedData };
  } catch (err: any) {
    return { error: err.message, chartData: [], normalizedData: [] };
  }
}

export async function getDashboardAlerts() {
  try {
    const alerts: any[] = [];
    
    // Stock critical
    const criticalStockProducts = await prisma.product.findMany({
      where: { stock: { lte: 2 } },
      take: 2,
      orderBy: { stock: 'asc' }
    });
    
    criticalStockProducts.forEach(p => {
      alerts.push({
        title: "Estoque crítico",
        desc: `${p.name} — Apenas ${p.stock} un.`,
        type: "warning"
      });
    });

    // Expirations
    const expiringSoon = await prisma.stockEntryItem.findMany({
      where: { 
        expirationDate: {
          lte: new Date(new Date().setDate(new Date().getDate() + 15)),
          gte: new Date()
        }
      },
      include: { product: true },
      take: 2
    });

    expiringSoon.forEach(item => {
      if (!item.expirationDate) return;
      const days = Math.ceil((item.expirationDate!.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      alerts.push({
        title: "Vencimento próximo",
        desc: `${item.product.name} — Vence em ${days} dias`,
        type: "danger"
      });
    });

    // New Customers Today
    const today = new Date();
    today.setHours(0,0,0,0);
    const newCustomersCount = await prisma.customer.count({
      where: { createdAt: { gte: today } }
    });
    if (newCustomersCount > 0) {
      alerts.push({
        title: "Novos Clientes",
        desc: `${newCustomersCount} clientes cadastrados hoje`,
        type: "info"
      });
    }

    return { alerts };
  } catch (err: any) {
    return { error: err.message, alerts: [] };
  }
}

export async function getWelcomeData() {
  try {
    const criticalItems = await prisma.product.count({
      where: { stock: { lte: 5 } }
    });

    const expiringItems = await prisma.stockEntryItem.count({
      where: { 
        expirationDate: {
          lte: new Date(new Date().setDate(new Date().getDate() + 15)),
          gte: new Date()
        }
      }
    });

    return { criticalItems, expiringItems };
  } catch (err: any) {
    return { error: err.message, criticalItems: 0, expiringItems: 0 };
  }
}
