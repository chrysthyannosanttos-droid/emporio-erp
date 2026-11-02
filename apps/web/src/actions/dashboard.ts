"use server";

import { prisma } from "@emporio/database";
import { getSession } from "@/lib/session";

export async function getStoreRanking(month: number, year: number) {
  try {
    const session = await getSession();
    const companyId = session?.companyId;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Get all sales for the month
    const sales = await prisma.sale.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
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
      const cId = sale.companyId;
      const total = Number(sale.total);
      
      if (!companyMap.has(cId)) {
        companyMap.set(cId, {
          id: sale.company.id,
          name: sale.company.name,
          total: 0,
        });
      }
      
      const current = companyMap.get(cId)!;
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
    const session = await getSession();
    const companyId = session?.companyId;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // We need to fetch SaleItems within the given period to compute the mix
    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          ...(companyId ? { companyId } : {}),
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

      const categoryName = item.product?.category?.name || "Sem Categoria";
      
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
    const session = await getSession();
    const companyId = session?.companyId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    // Sales this month
    const thisMonthSales = await prisma.sale.aggregate({
      _sum: { total: true },
      where: {
        ...(companyId ? { companyId } : {}),
        createdAt: { gte: firstDayOfMonth },
        status: "COMPLETED",
      },
    });

    // Sales last month for trend
    const lastMonthSales = await prisma.sale.aggregate({
      _sum: { total: true },
      where: {
        ...(companyId ? { companyId } : {}),
        createdAt: { gte: firstDayOfLastMonth, lt: firstDayOfMonth },
        status: "COMPLETED",
      },
    });

    const faturamentoMensal = Number(thisMonthSales._sum.total || 0);
    const faturamentoMensalAnterior = Number(lastMonthSales._sum.total || 0);
    const faturamentoTrend = faturamentoMensalAnterior > 0 
      ? ((faturamentoMensal - faturamentoMensalAnterior) / faturamentoMensalAnterior) * 100 
      : 0;

    // Sales Today vs Yesterday
    const salesToday = await prisma.sale.count({
      where: {
        ...(companyId ? { companyId } : {}),
        createdAt: { gte: today },
        status: "COMPLETED",
      },
    });
    const salesYesterday = await prisma.sale.count({
      where: {
        ...(companyId ? { companyId } : {}),
        createdAt: { gte: yesterday, lt: today },
        status: "COMPLETED",
      },
    });
    const salesTrend = salesYesterday > 0 
      ? ((salesToday - salesYesterday) / salesYesterday) * 100 
      : 0;

    // Customers this month
    const newCustomers = await prisma.customer.count({
      where: {
        ...(companyId ? { companyId } : {}),
        createdAt: { gte: firstDayOfMonth },
      },
    });
    const oldCustomers = await prisma.customer.count({
      where: {
        ...(companyId ? { companyId } : {}),
        createdAt: { gte: firstDayOfLastMonth, lt: firstDayOfMonth },
      },
    });
    const customersTrend = oldCustomers > 0 
      ? ((newCustomers - oldCustomers) / oldCustomers) * 100 
      : 0;

    // Low stock
    const lowStock = await prisma.product.count({
      where: {
        ...(companyId ? { companyId } : {}),
        stock: { lte: 5 },
      },
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
    const session = await getSession();
    const companyId = session?.companyId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days + 1);

    const sales = await prisma.sale.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
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
    const session = await getSession();
    const companyId = session?.companyId;

    const alerts: any[] = [];
    
    // Stock critical
    const criticalStockProducts = await prisma.product.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        stock: { lte: 2 },
      },
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
        ...(companyId ? { stockEntry: { companyId } } : {}),
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
      where: {
        ...(companyId ? { companyId } : {}),
        createdAt: { gte: today },
      }
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
    const session = await getSession();
    const companyId = session?.companyId;

    const criticalItems = await prisma.product.count({
      where: {
        ...(companyId ? { companyId } : {}),
        stock: { lte: 5 },
      }
    });

    const expiringItems = await prisma.stockEntryItem.count({
      where: { 
        ...(companyId ? { stockEntry: { companyId } } : {}),
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

export async function getDashboardOverview() {
  try {
    const session = await getSession();
    const companyId = session?.companyId;

    if (!companyId) {
      return {
        kpis: {
          faturamentoHoje: 0,
          faturamentoOntem: 0,
          faturamentoTrend: 0,
          sparklineFat: [0, 0, 0, 0, 0, 0, 0],
          margemBruta: 0,
          margemTrend: 0,
          sparklineMargem: [0, 0, 0, 0, 0, 0, 0],
          ticketMedio: 0,
          ticketTrend: 0,
          sparklineTicket: [0, 0, 0, 0, 0, 0, 0],
          itensVendidosHoje: 0,
          itensVendidosOntem: 0,
          itensTrend: 0,
          sparklineItens: [0, 0, 0, 0, 0, 0, 0],
          rupturasCount: 0,
          sparklineRupturas: [0, 0, 0, 0, 0, 0, 0],
        },
        soldItemsList: [],
        rupturesList: [],
        payments: {
          dinheiro: 0,
          debito: 0,
          credito: 0,
          pix: 0,
          outros: 0,
          total: 0,
        },
        recentMovements: [],
        storesPerformance: [],
        topProducts: {
          day: [],
          week: [],
          month: [],
        },
      };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 1. Sales today
    const salesToday = await prisma.sale.findMany({
      where: {
        companyId,
        createdAt: { gte: today },
        status: "COMPLETED",
      },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
        payments: true,
        user: { select: { name: true } },
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Sales yesterday
    const salesYesterday = await prisma.sale.findMany({
      where: {
        companyId,
        createdAt: { gte: yesterday, lt: today },
        status: "COMPLETED",
      },
      include: {
        items: true,
      },
    });

    const faturamentoHoje = salesToday.reduce((acc, s) => acc + Number(s.total || 0), 0);
    const faturamentoOntem = salesYesterday.reduce((acc, s) => acc + Number(s.total || 0), 0);
    const faturamentoTrend = faturamentoOntem > 0
      ? ((faturamentoHoje - faturamentoOntem) / faturamentoOntem) * 100
      : 0;

    let totalCostHoje = 0;
    salesToday.forEach(s => {
      s.items.forEach(it => {
        const cost = Number(it.product?.cost || 0);
        totalCostHoje += cost * it.quantity;
      });
    });
    const margemBruta = faturamentoHoje > 0
      ? Math.max(0, ((faturamentoHoje - totalCostHoje) / faturamentoHoje) * 100)
      : 0;

    const countVendasHoje = salesToday.length;
    const countVendasOntem = salesYesterday.length;
    const ticketMedio = countVendasHoje > 0 ? faturamentoHoje / countVendasHoje : 0;
    const ticketOntem = countVendasOntem > 0 ? faturamentoOntem / countVendasOntem : 0;
    const ticketTrend = ticketOntem > 0 ? ((ticketMedio - ticketOntem) / ticketOntem) * 100 : 0;

    const itensVendidosHoje = salesToday.reduce((acc, s) => acc + s.items.reduce((sum, it) => sum + it.quantity, 0), 0);
    const itensVendidosOntem = salesYesterday.reduce((acc, s) => acc + s.items.reduce((sum, it) => sum + it.quantity, 0), 0);
    const itensTrend = itensVendidosOntem > 0 ? ((itensVendidosHoje - itensVendidosOntem) / itensVendidosOntem) * 100 : 0;

    // 3. Last 7 days daily sales for sparkline
    const sparklineDays = 7;
    const sparklineFat: number[] = [];
    for (let i = sparklineDays - 1; i >= 0; i--) {
      const dStart = new Date(today);
      dStart.setDate(dStart.getDate() - i);
      const dEnd = new Date(dStart);
      dEnd.setDate(dEnd.getDate() + 1);
      const daySales = await prisma.sale.aggregate({
        _sum: { total: true },
        where: {
          companyId,
          createdAt: { gte: dStart, lt: dEnd },
          status: "COMPLETED",
        },
      });
      sparklineFat.push(Number(daySales._sum.total || 0));
    }

    // 4. Rupturas (Produtos com estoque <= 0)
    const ruptures = await prisma.product.findMany({
      where: {
        companyId,
        stock: { lte: 0 },
      },
      include: {
        category: true,
      },
      take: 20,
    });
    const rupturasCount = ruptures.length;
    const rupturesList = ruptures.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category?.name || "Geral",
      code: p.barcode || p.sku || "S/N",
      stock: p.stock,
      minStock: 5,
      supplier: p.brand || "Fornecedor",
      lastSale: "Sem vendas recentes",
      lossEst: `R$ ${Number(p.price).toFixed(2)}`,
    }));

    // 5. Sold Items List for Modal
    const soldItemsMap = new Map<string, {
      id: string;
      name: string;
      category: string;
      qty: number;
      unitPrice: number;
      total: number;
      code: string;
    }>();

    salesToday.forEach(s => {
      s.items.forEach(it => {
        const existing = soldItemsMap.get(it.productId);
        const itemTotal = Number(it.total || 0);
        if (existing) {
          existing.qty += it.quantity;
          existing.total += itemTotal;
        } else {
          soldItemsMap.set(it.productId, {
            id: it.productId,
            name: it.product?.name || "Produto",
            category: it.product?.category?.name || "Geral",
            qty: it.quantity,
            unitPrice: Number(it.unitPrice),
            total: itemTotal,
            code: it.product?.barcode || it.product?.sku || "S/N",
          });
        }
      });
    });
    const soldItemsList = Array.from(soldItemsMap.values()).sort((a, b) => b.qty - a.qty);

    // 6. Payment Methods Breakdown
    const payments = {
      dinheiro: 0,
      debito: 0,
      credito: 0,
      pix: 0,
      outros: 0,
      total: 0,
    };

    salesToday.forEach(s => {
      s.payments.forEach(p => {
        const amt = Number(p.amount || 0);
        const method = (p.paymentMethod || "").toUpperCase();
        payments.total += amt;
        if (method.includes("DINHEIRO") || method === "CASH") {
          payments.dinheiro += amt;
        } else if (method.includes("DEBITO") || method === "DEBIT") {
          payments.debito += amt;
        } else if (method.includes("CREDITO") || method === "CREDIT") {
          payments.credito += amt;
        } else if (method.includes("PIX")) {
          payments.pix += amt;
        } else {
          payments.outros += amt;
        }
      });
    });

    // 7. Recent Movements
    const recentMovements = salesToday.slice(0, 5).map(s => {
      const timeDiff = Math.max(1, Math.round((Date.now() - s.createdAt.getTime()) / 60000));
      const timeText = timeDiff < 60 ? `${timeDiff} min atrás` : `${Math.round(timeDiff / 60)}h atrás`;
      return {
        id: s.id,
        title: "Venda realizada",
        subtitle: `#${s.id.slice(0, 6)} - ${s.customer?.name || "Cliente Balcão"}`,
        value: Number(s.total),
        timeText,
        type: "sale",
      };
    });

    // 8. Stores Performance
    const stores = await prisma.store.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
    });
    const storesPerformance = stores.map((st, idx) => ({
      name: st.name || st.tradeName || `Loja ${idx + 1}`,
      val: `R$ ${faturamentoHoje.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      pct: countVendasHoje > 0 ? "100%" : "0%",
      width: countVendasHoje > 0 ? "100%" : "0%",
    }));

    // 9. Top Products (day, week, month)
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const weekItems = await prisma.saleItem.findMany({
      where: {
        sale: { companyId, createdAt: { gte: weekStart }, status: "COMPLETED" },
      },
      include: { product: true },
    });

    const monthItems = await prisma.saleItem.findMany({
      where: {
        sale: { companyId, createdAt: { gte: monthStart }, status: "COMPLETED" },
      },
      include: { product: true },
    });

    function aggregateTop(items: typeof weekItems) {
      const m = new Map<string, { rank: number; icon: string; name: string; val: number; qty: number }>();
      items.forEach(it => {
        const p = it.product;
        if (!p) return;
        const cur = m.get(p.id) || { rank: 0, icon: "📦", name: p.name, val: 0, qty: 0 };
        cur.val += Number(it.total || 0);
        cur.qty += it.quantity;
        m.set(p.id, cur);
      });
      return Array.from(m.values())
        .sort((a, b) => b.val - a.val)
        .slice(0, 5)
        .map((p, idx) => ({
          rank: idx + 1,
          icon: "📦",
          name: p.name,
          val: `R$ ${p.val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          pct: `${p.qty} un`,
        }));
    }

    const topProducts = {
      day: soldItemsList.slice(0, 5).map((p, idx) => ({
        rank: idx + 1,
        icon: "📦",
        name: p.name,
        val: `R$ ${p.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        pct: `${p.qty} un`,
      })),
      week: aggregateTop(weekItems),
      month: aggregateTop(monthItems),
    };

    return {
      kpis: {
        faturamentoHoje,
        faturamentoOntem,
        faturamentoTrend,
        sparklineFat,
        margemBruta,
        margemTrend: 0,
        sparklineMargem: [margemBruta, margemBruta, margemBruta, margemBruta, margemBruta, margemBruta, margemBruta],
        ticketMedio,
        ticketTrend,
        sparklineTicket: [ticketMedio, ticketMedio, ticketMedio, ticketMedio, ticketMedio, ticketMedio, ticketMedio],
        itensVendidosHoje,
        itensVendidosOntem,
        itensTrend,
        sparklineItens: [0, 0, 0, 0, 0, 0, itensVendidosHoje],
        rupturasCount,
        sparklineRupturas: [0, 0, 0, 0, 0, 0, rupturasCount],
      },
      soldItemsList,
      rupturesList,
      payments,
      recentMovements,
      storesPerformance,
      topProducts,
    };
  } catch (err: any) {
    console.error("Error in getDashboardOverview:", err);
    return {
      kpis: {
        faturamentoHoje: 0,
        faturamentoOntem: 0,
        faturamentoTrend: 0,
        sparklineFat: [0, 0, 0, 0, 0, 0, 0],
        margemBruta: 0,
        margemTrend: 0,
        sparklineMargem: [0, 0, 0, 0, 0, 0, 0],
        ticketMedio: 0,
        ticketTrend: 0,
        sparklineTicket: [0, 0, 0, 0, 0, 0, 0],
        itensVendidosHoje: 0,
        itensVendidosOntem: 0,
        itensTrend: 0,
        sparklineItens: [0, 0, 0, 0, 0, 0, 0],
        rupturasCount: 0,
        sparklineRupturas: [0, 0, 0, 0, 0, 0, 0],
      },
      soldItemsList: [],
      rupturesList: [],
      payments: {
        dinheiro: 0,
        debito: 0,
        credito: 0,
        pix: 0,
        outros: 0,
        total: 0,
      },
      recentMovements: [],
      storesPerformance: [],
      topProducts: {
        day: [],
        week: [],
        month: [],
      },
    };
  }
}
