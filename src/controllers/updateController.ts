import { Request, Response } from "express";
import prisma from "@/src/lib/prisma";
import { BadRequestError, UnAuthenticatedError } from "@/src/errors";
import { StatusCodes } from "http-status-codes";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import { redisCache } from "@/src/lib/redis";

const indexTvJp = async (req: any, res: Response) => {
  try {
    const EndPoint =
      "https://scanner.tradingview.com/symbol?symbol=TVC%3ANI225&fields=change%2CPerf.5D%2CPerf.W%2CPerf.1M%2CPerf.6M%2CPerf.YTD%2CPerf.Y%2CPerf.5Y%2CPerf.All&no_404=true&label-product=symbols-performance";
    const EndPointTechnical =
      "https://scanner.tradingview.com/symbol?symbol=TVC%3ANI225&fields=Recommend.Other%2CRecommend.All%2CRecommend.MA%2CRSI%2CRSI%5B1%5D%2CStoch.K%2CStoch.D%2CStoch.K%5B1%5D%2CStoch.D%5B1%5D%2CCCI20%2CCCI20%5B1%5D%2CADX%2CADX%2BDI%2CADX-DI%2CADX%2BDI%5B1%5D%2CADX-DI%5B1%5D%2CAO%2CAO%5B1%5D%2CAO%5B2%5D%2CMom%2CMom%5B1%5D%2CMACD.macd%2CMACD.signal%2CRec.Stoch.RSI%2CStoch.RSI.K%2CRec.WR%2CW.R%2CRec.BBPower%2CBBPower%2CRec.UO%2CUO%2CEMA10%2Cclose%2CSMA10%2CEMA20%2CSMA20%2CEMA30%2CSMA30%2CEMA50%2CSMA50%2CEMA100%2CSMA100%2CEMA200%2CSMA200%2CRec.Ichimoku%2CIchimoku.BLine%2CRec.VWMA%2CVWMA%2CRec.HullMA9%2CHullMA9%2CPivot.M.Classic.R3%2CPivot.M.Classic.R2%2CPivot.M.Classic.R1%2CPivot.M.Classic.Middle%2CPivot.M.Classic.S1%2CPivot.M.Classic.S2%2CPivot.M.Classic.S3%2CPivot.M.Fibonacci.R3%2CPivot.M.Fibonacci.R2%2CPivot.M.Fibonacci.R1%2CPivot.M.Fibonacci.Middle%2CPivot.M.Fibonacci.S1%2CPivot.M.Fibonacci.S2%2CPivot.M.Fibonacci.S3%2CPivot.M.Camarilla.R3%2CPivot.M.Camarilla.R2%2CPivot.M.Camarilla.R1%2CPivot.M.Camarilla.Middle%2CPivot.M.Camarilla.S1%2CPivot.M.Camarilla.S2%2CPivot.M.Camarilla.S3%2CPivot.M.Woodie.R3%2CPivot.M.Woodie.R2%2CPivot.M.Woodie.R1%2CPivot.M.Woodie.Middle%2CPivot.M.Woodie.S1%2CPivot.M.Woodie.S2%2CPivot.M.Woodie.S3%2CPivot.M.Demark.R1%2CPivot.M.Demark.Middle%2CPivot.M.Demark.S1&no_404=true&label-product=popup-technicals";

    const EndPoint2 =
      "https://scanner.tradingview.com/symbol?symbol=TSE%3ATOPIX&fields=change%2CPerf.5D%2CPerf.W%2CPerf.1M%2CPerf.6M%2CPerf.YTD%2CPerf.Y%2CPerf.5Y%2CPerf.All&no_404=true&label-product=symbols-performance";
    const EndPointTechnical2 =
      "https://scanner.tradingview.com/symbol?symbol=TSE%3ATOPIX&fields=Recommend.Other%2CRecommend.All%2CRecommend.MA%2CRSI%2CRSI%5B1%5D%2CStoch.K%2CStoch.D%2CStoch.K%5B1%5D%2CStoch.D%5B1%5D%2CCCI20%2CCCI20%5B1%5D%2CADX%2CADX%2BDI%2CADX-DI%2CADX%2BDI%5B1%5D%2CADX-DI%5B1%5D%2CAO%2CAO%5B1%5D%2CAO%5B2%5D%2CMom%2CMom%5B1%5D%2CMACD.macd%2CMACD.signal%2CRec.Stoch.RSI%2CStoch.RSI.K%2CRec.WR%2CW.R%2CRec.BBPower%2CBBPower%2CRec.UO%2CUO%2CEMA10%2Cclose%2CSMA10%2CEMA20%2CSMA20%2CEMA30%2CSMA30%2CEMA50%2CSMA50%2CEMA100%2CSMA100%2CEMA200%2CSMA200%2CRec.Ichimoku%2CIchimoku.BLine%2CRec.VWMA%2CVWMA%2CRec.HullMA9%2CHullMA9%2CPivot.M.Classic.R3%2CPivot.M.Classic.R2%2CPivot.M.Classic.R1%2CPivot.M.Classic.Middle%2CPivot.M.Classic.S1%2CPivot.M.Classic.S2%2CPivot.M.Classic.S3%2CPivot.M.Fibonacci.R3%2CPivot.M.Fibonacci.R2%2CPivot.M.Fibonacci.R1%2CPivot.M.Fibonacci.Middle%2CPivot.M.Fibonacci.S1%2CPivot.M.Fibonacci.S2%2CPivot.M.Fibonacci.S3%2CPivot.M.Camarilla.R3%2CPivot.M.Camarilla.R2%2CPivot.M.Camarilla.R1%2CPivot.M.Camarilla.Middle%2CPivot.M.Camarilla.S1%2CPivot.M.Camarilla.S2%2CPivot.M.Camarilla.S3%2CPivot.M.Woodie.R3%2CPivot.M.Woodie.R2%2CPivot.M.Woodie.R1%2CPivot.M.Woodie.Middle%2CPivot.M.Woodie.S1%2CPivot.M.Woodie.S2%2CPivot.M.Woodie.S3%2CPivot.M.Demark.R1%2CPivot.M.Demark.Middle%2CPivot.M.Demark.S1&no_404=true&label-product=popup-technicals";

    const EndPoint3 =
      "https://scanner.tradingview.com/symbol?symbol=TSE%3AI0500&fields=change%2CPerf.5D%2CPerf.W%2CPerf.1M%2CPerf.6M%2CPerf.YTD%2CPerf.Y%2CPerf.5Y%2CPerf.All&no_404=true&label-product=symbols-performance";
    const EndPointTechnical3 =
      "https://scanner.tradingview.com/symbol?symbol=TSE%3AI0500&fields=Recommend.Other%2CRecommend.All%2CRecommend.MA%2CRSI%2CRSI%5B1%5D%2CStoch.K%2CStoch.D%2CStoch.K%5B1%5D%2CStoch.D%5B1%5D%2CCCI20%2CCCI20%5B1%5D%2CADX%2CADX%2BDI%2CADX-DI%2CADX%2BDI%5B1%5D%2CADX-DI%5B1%5D%2CAO%2CAO%5B1%5D%2CAO%5B2%5D%2CMom%2CMom%5B1%5D%2CMACD.macd%2CMACD.signal%2CRec.Stoch.RSI%2CStoch.RSI.K%2CRec.WR%2CW.R%2CRec.BBPower%2CBBPower%2CRec.UO%2CUO%2CEMA10%2Cclose%2CSMA10%2CEMA20%2CSMA20%2CEMA30%2CSMA30%2CEMA50%2CSMA50%2CEMA100%2CSMA100%2CEMA200%2CSMA200%2CRec.Ichimoku%2CIchimoku.BLine%2CRec.VWMA%2CVWMA%2CRec.HullMA9%2CHullMA9%2CPivot.M.Classic.R3%2CPivot.M.Classic.R2%2CPivot.M.Classic.R1%2CPivot.M.Classic.Middle%2CPivot.M.Classic.S1%2CPivot.M.Classic.S2%2CPivot.M.Classic.S3%2CPivot.M.Fibonacci.R3%2CPivot.M.Fibonacci.R2%2CPivot.M.Fibonacci.R1%2CPivot.M.Fibonacci.Middle%2CPivot.M.Fibonacci.S1%2CPivot.M.Fibonacci.S2%2CPivot.M.Fibonacci.S3%2CPivot.M.Camarilla.R3%2CPivot.M.Camarilla.R2%2CPivot.M.Camarilla.R1%2CPivot.M.Camarilla.Middle%2CPivot.M.Camarilla.S1%2CPivot.M.Camarilla.S2%2CPivot.M.Camarilla.S3%2CPivot.M.Woodie.R3%2CPivot.M.Woodie.R2%2CPivot.M.Woodie.R1%2CPivot.M.Woodie.Middle%2CPivot.M.Woodie.S1%2CPivot.M.Woodie.S2%2CPivot.M.Woodie.S3%2CPivot.M.Demark.R1%2CPivot.M.Demark.Middle%2CPivot.M.Demark.S1&no_404=true&label-product=popup-technicals";

    const EndPoint4 =
      "https://scanner.tradingview.com/symbol?symbol=TSE%3ATOPIX100&fields=change%2CPerf.5D%2CPerf.W%2CPerf.1M%2CPerf.6M%2CPerf.YTD%2CPerf.Y%2CPerf.5Y%2CPerf.All&no_404=true&label-product=symbols-performance";
    const EndPointTechnical4 =
      "https://scanner.tradingview.com/symbol?symbol=TSE%3ATOPIX100&fields=Recommend.Other%2CRecommend.All%2CRecommend.MA%2CRSI%2CRSI%5B1%5D%2CStoch.K%2CStoch.D%2CStoch.K%5B1%5D%2CStoch.D%5B1%5D%2CCCI20%2CCCI20%5B1%5D%2CADX%2CADX%2BDI%2CADX-DI%2CADX%2BDI%5B1%5D%2CADX-DI%5B1%5D%2CAO%2CAO%5B1%5D%2CAO%5B2%5D%2CMom%2CMom%5B1%5D%2CMACD.macd%2CMACD.signal%2CRec.Stoch.RSI%2CStoch.RSI.K%2CRec.WR%2CW.R%2CRec.BBPower%2CBBPower%2CRec.UO%2CUO%2CEMA10%2Cclose%2CSMA10%2CEMA20%2CSMA20%2CEMA30%2CSMA30%2CEMA50%2CSMA50%2CEMA100%2CSMA100%2CEMA200%2CSMA200%2CRec.Ichimoku%2CIchimoku.BLine%2CRec.VWMA%2CVWMA%2CRec.HullMA9%2CHullMA9%2CPivot.M.Classic.R3%2CPivot.M.Classic.R2%2CPivot.M.Classic.R1%2CPivot.M.Classic.Middle%2CPivot.M.Classic.S1%2CPivot.M.Classic.S2%2CPivot.M.Classic.S3%2CPivot.M.Fibonacci.R3%2CPivot.M.Fibonacci.R2%2CPivot.M.Fibonacci.R1%2CPivot.M.Fibonacci.Middle%2CPivot.M.Fibonacci.S1%2CPivot.M.Fibonacci.S2%2CPivot.M.Fibonacci.S3%2CPivot.M.Camarilla.R3%2CPivot.M.Camarilla.R2%2CPivot.M.Camarilla.R1%2CPivot.M.Camarilla.Middle%2CPivot.M.Camarilla.S1%2CPivot.M.Camarilla.S2%2CPivot.M.Camarilla.S3%2CPivot.M.Woodie.R3%2CPivot.M.Woodie.R2%2CPivot.M.Woodie.R1%2CPivot.M.Woodie.Middle%2CPivot.M.Woodie.S1%2CPivot.M.Woodie.S2%2CPivot.M.Woodie.S3%2CPivot.M.Demark.R1%2CPivot.M.Demark.Middle%2CPivot.M.Demark.S1&no_404=true&label-product=popup-technicals";

    const EndPoint5 =
      "https://scanner.tradingview.com/symbol?symbol=TSE%3ATOPIX500&fields=change%2CPerf.5D%2CPerf.W%2CPerf.1M%2CPerf.6M%2CPerf.YTD%2CPerf.Y%2CPerf.5Y%2CPerf.All&no_404=true&label-product=symbols-performance";
    const EndPointTechnical5 =
      "https://scanner.tradingview.com/symbol?symbol=TSE%3ATOPIX500&fields=Recommend.Other%2CRecommend.All%2CRecommend.MA%2CRSI%2CRSI%5B1%5D%2CStoch.K%2CStoch.D%2CStoch.K%5B1%5D%2CStoch.D%5B1%5D%2CCCI20%2CCCI20%5B1%5D%2CADX%2CADX%2BDI%2CADX-DI%2CADX%2BDI%5B1%5D%2CADX-DI%5B1%5D%2CAO%2CAO%5B1%5D%2CAO%5B2%5D%2CMom%2CMom%5B1%5D%2CMACD.macd%2CMACD.signal%2CRec.Stoch.RSI%2CStoch.RSI.K%2CRec.WR%2CW.R%2CRec.BBPower%2CBBPower%2CRec.UO%2CUO%2CEMA10%2Cclose%2CSMA10%2CEMA20%2CSMA20%2CEMA30%2CSMA30%2CEMA50%2CSMA50%2CEMA100%2CSMA100%2CEMA200%2CSMA200%2CRec.Ichimoku%2CIchimoku.BLine%2CRec.VWMA%2CVWMA%2CRec.HullMA9%2CHullMA9%2CPivot.M.Classic.R3%2CPivot.M.Classic.R2%2CPivot.M.Classic.R1%2CPivot.M.Classic.Middle%2CPivot.M.Classic.S1%2CPivot.M.Classic.S2%2CPivot.M.Classic.S3%2CPivot.M.Fibonacci.R3%2CPivot.M.Fibonacci.R2%2CPivot.M.Fibonacci.R1%2CPivot.M.Fibonacci.Middle%2CPivot.M.Fibonacci.S1%2CPivot.M.Fibonacci.S2%2CPivot.M.Fibonacci.S3%2CPivot.M.Camarilla.R3%2CPivot.M.Camarilla.R2%2CPivot.M.Camarilla.R1%2CPivot.M.Camarilla.Middle%2CPivot.M.Camarilla.S1%2CPivot.M.Camarilla.S2%2CPivot.M.Camarilla.S3%2CPivot.M.Woodie.R3%2CPivot.M.Woodie.R2%2CPivot.M.Woodie.R1%2CPivot.M.Woodie.Middle%2CPivot.M.Woodie.S1%2CPivot.M.Woodie.S2%2CPivot.M.Woodie.S3%2CPivot.M.Demark.R1%2CPivot.M.Demark.Middle%2CPivot.M.Demark.S1&no_404=true&label-product=popup-technicals";

    const EndPoint6 =
      "https://scanner.tradingview.com/symbol?symbol=TSE%3ATOPIX1000&fields=change%2CPerf.5D%2CPerf.W%2CPerf.1M%2CPerf.6M%2CPerf.YTD%2CPerf.Y%2CPerf.5Y%2CPerf.All&no_404=true&label-product=symbols-performance";
    const EndPointTechnical6 =
      "https://scanner.tradingview.com/symbol?symbol=TSE%3ATOPIX1000&fields=Recommend.Other%2CRecommend.All%2CRecommend.MA%2CRSI%2CRSI%5B1%5D%2CStoch.K%2CStoch.D%2CStoch.K%5B1%5D%2CStoch.D%5B1%5D%2CCCI20%2CCCI20%5B1%5D%2CADX%2CADX%2BDI%2CADX-DI%2CADX%2BDI%5B1%5D%2CADX-DI%5B1%5D%2CAO%2CAO%5B1%5D%2CAO%5B2%5D%2CMom%2CMom%5B1%5D%2CMACD.macd%2CMACD.signal%2CRec.Stoch.RSI%2CStoch.RSI.K%2CRec.WR%2CW.R%2CRec.BBPower%2CBBPower%2CRec.UO%2CUO%2CEMA10%2Cclose%2CSMA10%2CEMA20%2CSMA20%2CEMA30%2CSMA30%2CEMA50%2CSMA50%2CEMA100%2CSMA100%2CEMA200%2CSMA200%2CRec.Ichimoku%2CIchimoku.BLine%2CRec.VWMA%2CVWMA%2CRec.HullMA9%2CHullMA9%2CPivot.M.Classic.R3%2CPivot.M.Classic.R2%2CPivot.M.Classic.R1%2CPivot.M.Classic.Middle%2CPivot.M.Classic.S1%2CPivot.M.Classic.S2%2CPivot.M.Classic.S3%2CPivot.M.Fibonacci.R3%2CPivot.M.Fibonacci.R2%2CPivot.M.Fibonacci.R1%2CPivot.M.Fibonacci.Middle%2CPivot.M.Fibonacci.S1%2CPivot.M.Fibonacci.S2%2CPivot.M.Fibonacci.S3%2CPivot.M.Camarilla.R3%2CPivot.M.Camarilla.R2%2CPivot.M.Camarilla.R1%2CPivot.M.Camarilla.Middle%2CPivot.M.Camarilla.S1%2CPivot.M.Camarilla.S2%2CPivot.M.Camarilla.S3%2CPivot.M.Woodie.R3%2CPivot.M.Woodie.R2%2CPivot.M.Woodie.R1%2CPivot.M.Woodie.Middle%2CPivot.M.Woodie.S1%2CPivot.M.Woodie.S2%2CPivot.M.Woodie.S3%2CPivot.M.Demark.R1%2CPivot.M.Demark.Middle%2CPivot.M.Demark.S1&no_404=true&label-product=popup-technicals";

    const EndPoint7 =
      "https://scanner.tradingview.com/symbol?symbol=TSE%3ALARGE70&fields=change%2CPerf.5D%2CPerf.W%2CPerf.1M%2CPerf.6M%2CPerf.YTD%2CPerf.Y%2CPerf.5Y%2CPerf.All&no_404=true&label-product=symbols-performance";
    const EndPointTechnical7 =
      "https://scanner.tradingview.com/symbol?symbol=TSE%3ALARGE70&fields=Recommend.Other%2CRecommend.All%2CRecommend.MA%2CRSI%2CRSI%5B1%5D%2CStoch.K%2CStoch.D%2CStoch.K%5B1%5D%2CStoch.D%5B1%5D%2CCCI20%2CCCI20%5B1%5D%2CADX%2CADX%2BDI%2CADX-DI%2CADX%2BDI%5B1%5D%2CADX-DI%5B1%5D%2CAO%2CAO%5B1%5D%2CAO%5B2%5D%2CMom%2CMom%5B1%5D%2CMACD.macd%2CMACD.signal%2CRec.Stoch.RSI%2CStoch.RSI.K%2CRec.WR%2CW.R%2CRec.BBPower%2CBBPower%2CRec.UO%2CUO%2CEMA10%2Cclose%2CSMA10%2CEMA20%2CSMA20%2CEMA30%2CSMA30%2CEMA50%2CSMA50%2CEMA100%2CSMA100%2CEMA200%2CSMA200%2CRec.Ichimoku%2CIchimoku.BLine%2CRec.VWMA%2CVWMA%2CRec.HullMA9%2CHullMA9%2CPivot.M.Classic.R3%2CPivot.M.Classic.R2%2CPivot.M.Classic.R1%2CPivot.M.Classic.Middle%2CPivot.M.Classic.S1%2CPivot.M.Classic.S2%2CPivot.M.Classic.S3%2CPivot.M.Fibonacci.R3%2CPivot.M.Fibonacci.R2%2CPivot.M.Fibonacci.R1%2CPivot.M.Fibonacci.Middle%2CPivot.M.Fibonacci.S1%2CPivot.M.Fibonacci.S2%2CPivot.M.Fibonacci.S3%2CPivot.M.Camarilla.R3%2CPivot.M.Camarilla.R2%2CPivot.M.Camarilla.R1%2CPivot.M.Camarilla.Middle%2CPivot.M.Camarilla.S1%2CPivot.M.Camarilla.S2%2CPivot.M.Camarilla.S3%2CPivot.M.Woodie.R3%2CPivot.M.Woodie.R2%2CPivot.M.Woodie.R1%2CPivot.M.Woodie.Middle%2CPivot.M.Woodie.S1%2CPivot.M.Woodie.S2%2CPivot.M.Woodie.S3%2CPivot.M.Demark.R1%2CPivot.M.Demark.Middle%2CPivot.M.Demark.S1&no_404=true&label-product=popup-technicals";

    const EndPoint8 =
      "https://scanner.tradingview.com/symbol?symbol=TSE%3AMID400&fields=change%2CPerf.5D%2CPerf.W%2CPerf.1M%2CPerf.6M%2CPerf.YTD%2CPerf.Y%2CPerf.5Y%2CPerf.All&no_404=true&label-product=symbols-performance";
    const EndPointTechnical8 =
      "https://scanner.tradingview.com/symbol?symbol=TSE%3AMID400&fields=Recommend.Other%2CRecommend.All%2CRecommend.MA%2CRSI%2CRSI%5B1%5D%2CStoch.K%2CStoch.D%2CStoch.K%5B1%5D%2CStoch.D%5B1%5D%2CCCI20%2CCCI20%5B1%5D%2CADX%2CADX%2BDI%2CADX-DI%2CADX%2BDI%5B1%5D%2CADX-DI%5B1%5D%2CAO%2CAO%5B1%5D%2CAO%5B2%5D%2CMom%2CMom%5B1%5D%2CMACD.macd%2CMACD.signal%2CRec.Stoch.RSI%2CStoch.RSI.K%2CRec.WR%2CW.R%2CRec.BBPower%2CBBPower%2CRec.UO%2CUO%2CEMA10%2Cclose%2CSMA10%2CEMA20%2CSMA20%2CEMA30%2CSMA30%2CEMA50%2CSMA50%2CEMA100%2CSMA100%2CEMA200%2CSMA200%2CRec.Ichimoku%2CIchimoku.BLine%2CRec.VWMA%2CVWMA%2CRec.HullMA9%2CHullMA9%2CPivot.M.Classic.R3%2CPivot.M.Classic.R2%2CPivot.M.Classic.R1%2CPivot.M.Classic.Middle%2CPivot.M.Classic.S1%2CPivot.M.Classic.S2%2CPivot.M.Classic.S3%2CPivot.M.Fibonacci.R3%2CPivot.M.Fibonacci.R2%2CPivot.M.Fibonacci.R1%2CPivot.M.Fibonacci.Middle%2CPivot.M.Fibonacci.S1%2CPivot.M.Fibonacci.S2%2CPivot.M.Fibonacci.S3%2CPivot.M.Camarilla.R3%2CPivot.M.Camarilla.R2%2CPivot.M.Camarilla.R1%2CPivot.M.Camarilla.Middle%2CPivot.M.Camarilla.S1%2CPivot.M.Camarilla.S2%2CPivot.M.Camarilla.S3%2CPivot.M.Woodie.R3%2CPivot.M.Woodie.R2%2CPivot.M.Woodie.R1%2CPivot.M.Woodie.Middle%2CPivot.M.Woodie.S1%2CPivot.M.Woodie.S2%2CPivot.M.Woodie.S3%2CPivot.M.Demark.R1%2CPivot.M.Demark.Middle%2CPivot.M.Demark.S1&no_404=true&label-product=popup-technicals";

    const EndPoint9 =
      "https://scanner.tradingview.com/symbol?symbol=TSE%3ASMALL&fields=change%2CPerf.5D%2CPerf.W%2CPerf.1M%2CPerf.6M%2CPerf.YTD%2CPerf.Y%2CPerf.5Y%2CPerf.All&no_404=true&label-product=symbols-performance";
    const EndPointTechnical9 =
      "https://scanner.tradingview.com/symbol?symbol=TSE%3ASMALL&fields=Recommend.Other%2CRecommend.All%2CRecommend.MA%2CRSI%2CRSI%5B1%5D%2CStoch.K%2CStoch.D%2CStoch.K%5B1%5D%2CStoch.D%5B1%5D%2CCCI20%2CCCI20%5B1%5D%2CADX%2CADX%2BDI%2CADX-DI%2CADX%2BDI%5B1%5D%2CADX-DI%5B1%5D%2CAO%2CAO%5B1%5D%2CAO%5B2%5D%2CMom%2CMom%5B1%5D%2CMACD.macd%2CMACD.signal%2CRec.Stoch.RSI%2CStoch.RSI.K%2CRec.WR%2CW.R%2CRec.BBPower%2CBBPower%2CRec.UO%2CUO%2CEMA10%2Cclose%2CSMA10%2CEMA20%2CSMA20%2CEMA30%2CSMA30%2CEMA50%2CSMA50%2CEMA100%2CSMA100%2CEMA200%2CSMA200%2CRec.Ichimoku%2CIchimoku.BLine%2CRec.VWMA%2CVWMA%2CRec.HullMA9%2CHullMA9%2CPivot.M.Classic.R3%2CPivot.M.Classic.R2%2CPivot.M.Classic.R1%2CPivot.M.Classic.Middle%2CPivot.M.Classic.S1%2CPivot.M.Classic.S2%2CPivot.M.Classic.S3%2CPivot.M.Fibonacci.R3%2CPivot.M.Fibonacci.R2%2CPivot.M.Fibonacci.R1%2CPivot.M.Fibonacci.Middle%2CPivot.M.Fibonacci.S1%2CPivot.M.Fibonacci.S2%2CPivot.M.Fibonacci.S3%2CPivot.M.Camarilla.R3%2CPivot.M.Camarilla.R2%2CPivot.M.Camarilla.R1%2CPivot.M.Camarilla.Middle%2CPivot.M.Camarilla.S1%2CPivot.M.Camarilla.S2%2CPivot.M.Camarilla.S3%2CPivot.M.Woodie.R3%2CPivot.M.Woodie.R2%2CPivot.M.Woodie.R1%2CPivot.M.Woodie.Middle%2CPivot.M.Woodie.S1%2CPivot.M.Woodie.S2%2CPivot.M.Woodie.S3%2CPivot.M.Demark.R1%2CPivot.M.Demark.Middle%2CPivot.M.Demark.S1&no_404=true&label-product=popup-technicals";

    const EndPoint10 =
      "https://scanner.tradingview.com/symbol?symbol=TSE%3AT17FIN&fields=change%2CPerf.5D%2CPerf.W%2CPerf.1M%2CPerf.6M%2CPerf.YTD%2CPerf.Y%2CPerf.5Y%2CPerf.All&no_404=true&label-product=symbols-performance";
    const EndPointTechnical10 =
      "https://scanner.tradingview.com/symbol?symbol=TSE%3AT17FIN&fields=Recommend.Other%2CRecommend.All%2CRecommend.MA%2CRSI%2CRSI%5B1%5D%2CStoch.K%2CStoch.D%2CStoch.K%5B1%5D%2CStoch.D%5B1%5D%2CCCI20%2CCCI20%5B1%5D%2CADX%2CADX%2BDI%2CADX-DI%2CADX%2BDI%5B1%5D%2CADX-DI%5B1%5D%2CAO%2CAO%5B1%5D%2CAO%5B2%5D%2CMom%2CMom%5B1%5D%2CMACD.macd%2CMACD.signal%2CRec.Stoch.RSI%2CStoch.RSI.K%2CRec.WR%2CW.R%2CRec.BBPower%2CBBPower%2CRec.UO%2CUO%2CEMA10%2Cclose%2CSMA10%2CEMA20%2CSMA20%2CEMA30%2CSMA30%2CEMA50%2CSMA50%2CEMA100%2CSMA100%2CEMA200%2CSMA200%2CRec.Ichimoku%2CIchimoku.BLine%2CRec.VWMA%2CVWMA%2CRec.HullMA9%2CHullMA9%2CPivot.M.Classic.R3%2CPivot.M.Classic.R2%2CPivot.M.Classic.R1%2CPivot.M.Classic.Middle%2CPivot.M.Classic.S1%2CPivot.M.Classic.S2%2CPivot.M.Classic.S3%2CPivot.M.Fibonacci.R3%2CPivot.M.Fibonacci.R2%2CPivot.M.Fibonacci.R1%2CPivot.M.Fibonacci.Middle%2CPivot.M.Fibonacci.S1%2CPivot.M.Fibonacci.S2%2CPivot.M.Fibonacci.S3%2CPivot.M.Camarilla.R3%2CPivot.M.Camarilla.R2%2CPivot.M.Camarilla.R1%2CPivot.M.Camarilla.Middle%2CPivot.M.Camarilla.S1%2CPivot.M.Camarilla.S2%2CPivot.M.Camarilla.S3%2CPivot.M.Woodie.R3%2CPivot.M.Woodie.R2%2CPivot.M.Woodie.R1%2CPivot.M.Woodie.Middle%2CPivot.M.Woodie.S1%2CPivot.M.Woodie.S2%2CPivot.M.Woodie.S3%2CPivot.M.Demark.R1%2CPivot.M.Demark.Middle%2CPivot.M.Demark.S1&no_404=true&label-product=popup-technicals";

    const EndPoint11 =
      "https://scanner.tradingview.com/symbol?symbol=TSE%3AT17RE&fields=change%2CPerf.5D%2CPerf.W%2CPerf.1M%2CPerf.6M%2CPerf.YTD%2CPerf.Y%2CPerf.5Y%2CPerf.All&no_404=true&label-product=symbols-performance";
    const EndPointTechnical11 =
      "https://scanner.tradingview.com/symbol?symbol=TSE%3AT17RE&fields=Recommend.Other%2CRecommend.All%2CRecommend.MA%2CRSI%2CRSI%5B1%5D%2CStoch.K%2CStoch.D%2CStoch.K%5B1%5D%2CStoch.D%5B1%5D%2CCCI20%2CCCI20%5B1%5D%2CADX%2CADX%2BDI%2CADX-DI%2CADX%2BDI%5B1%5D%2CADX-DI%5B1%5D%2CAO%2CAO%5B1%5D%2CAO%5B2%5D%2CMom%2CMom%5B1%5D%2CMACD.macd%2CMACD.signal%2CRec.Stoch.RSI%2CStoch.RSI.K%2CRec.WR%2CW.R%2CRec.BBPower%2CBBPower%2CRec.UO%2CUO%2CEMA10%2Cclose%2CSMA10%2CEMA20%2CSMA20%2CEMA30%2CSMA30%2CEMA50%2CSMA50%2CEMA100%2CSMA100%2CEMA200%2CSMA200%2CRec.Ichimoku%2CIchimoku.BLine%2CRec.VWMA%2CVWMA%2CRec.HullMA9%2CHullMA9%2CPivot.M.Classic.R3%2CPivot.M.Classic.R2%2CPivot.M.Classic.R1%2CPivot.M.Classic.Middle%2CPivot.M.Classic.S1%2CPivot.M.Classic.S2%2CPivot.M.Classic.S3%2CPivot.M.Fibonacci.R3%2CPivot.M.Fibonacci.R2%2CPivot.M.Fibonacci.R1%2CPivot.M.Fibonacci.Middle%2CPivot.M.Fibonacci.S1%2CPivot.M.Fibonacci.S2%2CPivot.M.Fibonacci.S3%2CPivot.M.Camarilla.R3%2CPivot.M.Camarilla.R2%2CPivot.M.Camarilla.R1%2CPivot.M.Camarilla.Middle%2CPivot.M.Camarilla.S1%2CPivot.M.Camarilla.S2%2CPivot.M.Camarilla.S3%2CPivot.M.Woodie.R3%2CPivot.M.Woodie.R2%2CPivot.M.Woodie.R1%2CPivot.M.Woodie.Middle%2CPivot.M.Woodie.S1%2CPivot.M.Woodie.S2%2CPivot.M.Woodie.S3%2CPivot.M.Demark.R1%2CPivot.M.Demark.Middle%2CPivot.M.Demark.S1&no_404=true&label-product=popup-technicals";

    const response = await fetch(EndPoint);
    const gData = await response.json();
    const responseTechnical = await fetch(EndPointTechnical);
    const gDataTechnical = await responseTechnical.json();

    const response2 = await fetch(EndPoint2);
    const gData2 = await response2.json();
    const responseTechnical2 = await fetch(EndPointTechnical2);
    const gDataTechnical2 = await responseTechnical2.json();

    const response3 = await fetch(EndPoint3);
    const gData3 = await response3.json();
    const responseTechnical3 = await fetch(EndPointTechnical3);
    const gDataTechnical3 = await responseTechnical3.json();

    const response4 = await fetch(EndPoint4);
    const gData4 = await response4.json();
    const responseTechnical4 = await fetch(EndPointTechnical4);
    const gDataTechnical4 = await responseTechnical4.json();

    const response5 = await fetch(EndPoint5);
    const gData5 = await response5.json();
    const responseTechnical5 = await fetch(EndPointTechnical5);
    const gDataTechnical5 = await responseTechnical5.json();

    const response6 = await fetch(EndPoint6);
    const gData6 = await response6.json();
    const responseTechnical6 = await fetch(EndPointTechnical6);
    const gDataTechnical6 = await responseTechnical6.json();

    const response7 = await fetch(EndPoint7);
    const gData7 = await response7.json();
    const responseTechnical7 = await fetch(EndPointTechnical7);
    const gDataTechnical7 = await responseTechnical7.json();

    const response8 = await fetch(EndPoint8);
    const gData8 = await response8.json();
    const responseTechnical8 = await fetch(EndPointTechnical8);
    const gDataTechnical8 = await responseTechnical8.json();

    const response9 = await fetch(EndPoint9);
    const gData9 = await response9.json();
    const responseTechnical9 = await fetch(EndPointTechnical9);
    const gDataTechnical9 = await responseTechnical9.json();

    const response10 = await fetch(EndPoint10);
    const gData10 = await response10.json();
    const responseTechnical10 = await fetch(EndPointTechnical10);
    const gDataTechnical10 = await responseTechnical10.json();

    const response11 = await fetch(EndPoint11);
    const gData11 = await response11.json();
    const responseTechnical11 = await fetch(EndPointTechnical11);
    const gDataTechnical11 = await responseTechnical11.json();

    const finalOverview = [];
    const finalTechnical = [];

    finalOverview.push({
      name: "NI225",
      overview: gData,
    });

    finalOverview.push({
      name: "TOPIX",
      overview: gData2,
    });

    finalOverview.push({
      name: "I0500",
      overview: gData3,
    });

    finalOverview.push({
      name: "TOPIX100",
      overview: gData4,
    });
    finalOverview.push({
      name: "TOPIX500",
      overview: gData5,
    });
    finalOverview.push({
      name: "TOPIX1000",
      overview: gData6,
    });

    finalOverview.push({
      name: "LARGE70",
      overview: gData7,
    });
    finalOverview.push({
      name: "MID400",
      overview: gData8,
    });
    finalOverview.push({
      name: "SMALL",
      overview: gData9,
    });
    finalOverview.push({
      name: "T17FIN",
      overview: gData10,
    });
    finalOverview.push({
      name: "T17RE",
      overview: gData11,
    });

    // Technical

    finalTechnical.push({
      name: "NI225",
      technical: gDataTechnical,
    });

    finalTechnical.push({
      name: "TOPIX",
      technical: gDataTechnical2,
    });

    finalTechnical.push({
      name: "I0500",
      technical: gDataTechnical3,
    });

    finalTechnical.push({
      name: "TOPIX100",
      technical: gDataTechnical4,
    });

    finalTechnical.push({
      name: "TOPIX500",
      technical: gDataTechnical5,
    });

    finalTechnical.push({
      name: "TOPIX1000",
      technical: gDataTechnical6,
    });

    finalTechnical.push({
      name: "LARGE70",
      technical: gDataTechnical7,
    });
    finalTechnical.push({
      name: "MID400",
      technical: gDataTechnical8,
    });
    finalTechnical.push({
      name: "SMALL",
      technical: gDataTechnical9,
    });

    finalTechnical.push({
      name: "T17FIN",
      technical: gDataTechnical10,
    });

    finalTechnical.push({
      name: "T17RE",
      technical: gDataTechnical11,
    });

    await prisma.marketIndex.upsert({
      where: {
        country: "JP",
      },
      create: {
        country: "JP",
        overview: finalOverview,
        technical: finalTechnical,
      },
      update: {
        overview: finalOverview,
        technical: finalTechnical,
      },
    });
    console.log("Done");
    res.status(StatusCodes.OK).json({ success: true });
  } catch (error: any) {
    console.log(error);
    throw new BadRequestError(error.message || "Something went wrong!");
  }
};

const presetTvJp = async (req: any, res: Response) => {
  try {
    const EndPoint =
      "https://scanner.tradingview.com/japan/scan?label-product=markets-screener";
    const Presets = [
      "large_cap",
      "small_cap",
      "largest_employers",
      "high_dividend",
      "highest_net_income",
      "highest_cash",
      "highest_profit_per_employee",
      "highest_revenue_per_employee",
      "gainers",
      "losers",
      "volume_leaders",
      "unusual_volume",
      "most_volatile",
      "high_beta",
      "best_performing",
      "highest_revenue",
      "most_expensive",
      "penny_stocks",
      "overbought",
      "oversold",
      "all_time_high",
      "all_time_low",
      "above_52wk_high",
      "below_52wk_low",
    ];
    const TotalStocks = 100;

    const AllRes = ["name"];
    for (let i = 0; i < Presets.length; i++) {
      const request = await fetch(EndPoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          columns: AllRes,
          ignore_unknown_fields: false,
          options: {
            lang: "en",
          },
          range: [0, TotalStocks],
          sort: {
            sortBy: "name",
            sortOrder: "asc",
            nullsFirst: false,
          },
          preset: Presets[i],
        }),
      });
      const final = [];
      const response = await request.json();
      for (let item of response.data) {
        const symbol = item.d[0];
        final.push(symbol);
      }
      await prisma.marketList.upsert({
        where: {
          country: "JP",
        },
        create: {
          country: "JP",
          [Presets[i]]: final,
        },
        update: {
          [Presets[i]]: final,
        },
      });
    }
    console.log("Done");
    res.status(StatusCodes.OK).json({ success: true });
  } catch (error: any) {
    console.log(error);
    throw new BadRequestError(error.message || "Something went wrong!");
  }
};

const sectorTvJp = async (req: any, res: Response) => {
  try {
    const EndPoint =
      "https://scanner.tradingview.com/japan/scan?label-product=markets-screener";
    const Total = 100;

    const SectorsPerformance = [
      "description",
      "market",
      "change",
      "Perf.W",
      "Perf.1M",
      "Perf.3M",
      "Perf.6M",
      "Perf.YTD",
      "Perf.Y",
      "Perf.5Y",
      "Perf.10Y",
      "Perf.All",
    ];

    const SectorsOverview = [
      "description",
      "market",
      "market_cap_basic",
      "type",
      "typespecs",
      "fundamental_currency_code",
      "dividends_yield",
      "change",
      "volume",
      "elements",
      "basic_elements",
    ];

    const IndustriesOverview = [
      "description",
      "market",
      "market_cap_basic",
      "type",
      "typespecs",
      "fundamental_currency_code",
      "dividends_yield",
      "change",
      "volume",
      "sector.tr",
      "sector",
      "basic_elements",
    ];

    const IndustriesPerformance = [
      "description",
      "market",
      "change",
      "Perf.W",
      "Perf.1M",
      "Perf.3M",
      "Perf.6M",
      "Perf.YTD",
      "Perf.Y",
      "Perf.5Y",
      "Perf.10Y",
      "Perf.All",
    ];

    const AllSectors = new Set([...SectorsOverview, ...SectorsPerformance]);

    const AllIndustries = new Set([
      ...IndustriesOverview,
      ...IndustriesPerformance,
    ]);

    const sectors = Array.from(AllSectors);
    const request = await fetch(EndPoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        columns: sectors,
        ignore_unknown_fields: false,
        options: {
          lang: "en",
        },
        range: [0, Total],
        sort: {
          sortBy: "name",
          sortOrder: "asc",
          nullsFirst: false,
        },
        preset: "market_sectors",
      }),
    });
    const final = [];
    const response = await request.json();

    for (let item of response.data) {
      const data: any = {};
      for (let i = 0; i < item.d.length; i++) {
        data[sectors[i].toLowerCase().replace(/\./g, "_")] = `${item.d[i]}`;
      }
      final.push(data);
      console.log(data?.description);

      await prisma.marketSector.upsert({
        where: {
          country_description: {
            description: data.description,
            country: "JP",
          },
        },
        create: {
          country: "JP",
          ...data,
        },
        update: {
          ...data,
        },
      });
    }
    console.log("Sectors", final);

    console.log("Done");
    res.status(StatusCodes.OK).json({ success: true });
  } catch (error: any) {
    console.log(error);
    throw new BadRequestError(error.message || "Something went wrong!");
  }
};

const allStocksTvJp = async (req: any, res: Response) => {
  try {
    const EndPoint =
      "https://scanner.tradingview.com/japan/scan?label-product=markets-screener";
    const Country = "BD";
    const TotalStocks = 3953;

    const Overview = [
      "name",
      "description",
      "logoid",
      "update_mode",
      "type",
      "typespecs",
      "close",
      "pricescale",
      "minmov",
      "fractional",
      "minmove2",
      "currency",
      "change",
      "volume",
      "relative_volume_10d_calc",
      "market_cap_basic",
      "fundamental_currency_code",
      "price_earnings_ttm",
      "earnings_per_share_diluted_ttm",
      "earnings_per_share_diluted_yoy_growth_ttm",
      "dividends_yield_current",
      "sector.tr",
      "market",
      "sector",
      "recommendation_mark",
    ];

    const Perfomance = [
      "name",
      "description",
      "logoid",
      "update_mode",
      "type",
      "typespecs",
      "close",
      "pricescale",
      "minmov",
      "fractional",
      "minmove2",
      "currency",
      "change",
      "Perf.W",
      "Perf.1M",
      "Perf.3M",
      "Perf.6M",
      "Perf.YTD",
      "Perf.Y",
      "Perf.5Y",
      "Perf.10Y",
      "Perf.All",
      "Volatility.W",
      "Volatility.M",
    ];

    const Valuation = [
      "name",
      "description",
      "logoid",
      "update_mode",
      "type",
      "typespecs",
      "market_cap_basic",
      "fundamental_currency_code",
      "Perf.1Y.MarketCap",
      "price_earnings_ttm",
      "price_earnings_growth_ttm",
      "price_sales_current",
      "price_book_fq",
      "price_to_cash_f_operating_activities_ttm",
      "price_free_cash_flow_ttm",
      "price_to_cash_ratio",
      "enterprise_value_current",
      "enterprise_value_to_revenue_ttm",
      "enterprise_value_to_ebit_ttm",
      "enterprise_value_ebitda_ttm",
    ];

    const Dividends = [
      "name",
      "description",
      "logoid",
      "update_mode",
      "type",
      "typespecs",
      "dps_common_stock_prim_issue_fy",
      "fundamental_currency_code",
      "dps_common_stock_prim_issue_fq",
      "dividends_yield_current",
      "dividends_yield",
      "dividend_payout_ratio_ttm",
      "dps_common_stock_prim_issue_yoy_growth_fy",
      "continuous_dividend_payout",
      "continuous_dividend_growth",
    ];

    const Profitability = [
      "name",
      "description",
      "logoid",
      "update_mode",
      "type",
      "typespecs",
      "gross_margin_ttm",
      "operating_margin_ttm",
      "pre_tax_margin_ttm",
      "net_margin_ttm",
      "free_cash_flow_margin_ttm",
      "return_on_assets_fq",
      "return_on_equity_fq",
      "return_on_invested_capital_fq",
      "research_and_dev_ratio_ttm",
      "sell_gen_admin_exp_other_ratio_ttm",
    ];

    const IncomeStatement = [
      "name",
      "description",
      "logoid",
      "update_mode",
      "type",
      "typespecs",
      "total_revenue_ttm",
      "fundamental_currency_code",
      "total_revenue_yoy_growth_ttm",
      "gross_profit_ttm",
      "oper_income_ttm",
      "net_income_ttm",
      "ebitda_ttm",
      "earnings_per_share_diluted_ttm",
      "earnings_per_share_diluted_yoy_growth_ttm",
    ];

    const BalanceSheet = [
      "name",
      "description",
      "logoid",
      "update_mode",
      "type",
      "typespecs",
      "total_assets_fq",
      "fundamental_currency_code",
      "total_current_assets_fq",
      "cash_n_short_term_invest_fq",
      "total_liabilities_fq",
      "total_debt_fq",
      "net_debt_fq",
      "total_equity_fq",
      "current_ratio_fq",
      "quick_ratio_fq",
      "debt_to_equity_fq",
      "cash_n_short_term_invest_to_total_debt_fq",
    ];

    const CashFlow = [
      "name",
      "description",
      "logoid",
      "update_mode",
      "type",
      "typespecs",
      "cash_f_operating_activities_ttm",
      "fundamental_currency_code",
      "cash_f_investing_activities_ttm",
      "cash_f_financing_activities_ttm",
      "free_cash_flow_ttm",
      "capital_expenditures_ttm",
    ];

    const Technical = [
      "name",
      "description",
      "logoid",
      "update_mode",
      "type",
      "typespecs",
      "Recommend.All",
      "Recommend.MA",
      "Recommend.Other",
      "RSI",
      "Mom",
      "pricescale",
      "minmov",
      "fractional",
      "minmove2",
      "AO",
      "CCI20",
      "Stoch.K",
      "Stoch.D",
      "MACD.macd",
      "MACD.signal",
    ];

    const MovingAverage = [
      "name",
      "description",
      "logoid",
      "update_mode",
      "type",
      "typespecs",
      "Rec.Stoch.RSI",
      "Stoch.RSI.K",
      "Rec.WR",
      "W.R",
      "EMA10",
      "close",
      "SMA10",
      "EMA20",
      "SMA20",
      "EMA30",
      "SMA30",
      "EMA50",
      "SMA50",
      "EMA100",
      "SMA100",
      "EMA200",
      "SMA200",
      "Rec.Ichimoku",
      "Ichimoku.BLine",
      "Rec.VWMA",
      "VWMA",
      "Rec.HullMA9",
      "HullMA9",
    ];

    const AllRes = [
      "name",
      "description",
      "logoid",
      "update_mode",
      "type",
      "close",
      "pricescale",
      "minmov",
      "fractional",
      "minmove2",
      "currency",
      "change",
      "volume",
      "relative_volume_10d_calc",
      "market_cap_basic",
      "fundamental_currency_code",
      "price_earnings_ttm",
      "earnings_per_share_diluted_ttm",
      "earnings_per_share_diluted_yoy_growth_ttm",
      "dividends_yield_current",
      "sector.tr",
      "market",
      "sector",
      "recommendation_mark",
      "Perf.1Y.MarketCap",
      "price_earnings_growth_ttm",
      "price_sales_current",
      "price_book_fq",
      "price_to_cash_f_operating_activities_ttm",
      "price_free_cash_flow_ttm",
      "price_to_cash_ratio",
      "enterprise_value_current",
      "enterprise_value_to_revenue_ttm",
      "enterprise_value_to_ebit_ttm",
      "enterprise_value_ebitda_ttm",
      "dps_common_stock_prim_issue_fy",
      "dps_common_stock_prim_issue_fq",
      "dividends_yield",
      "dividend_payout_ratio_ttm",
      "dps_common_stock_prim_issue_yoy_growth_fy",
      "continuous_dividend_payout",
      "continuous_dividend_growth",
      "gross_margin_ttm",
      "operating_margin_ttm",
      "pre_tax_margin_ttm",
      "net_margin_ttm",
      "free_cash_flow_margin_ttm",
      "return_on_assets_fq",
      "return_on_equity_fq",
      "return_on_invested_capital_fq",
      "research_and_dev_ratio_ttm",
      "sell_gen_admin_exp_other_ratio_ttm",
      "total_revenue_ttm",
      "total_revenue_yoy_growth_ttm",
      "gross_profit_ttm",
      "oper_income_ttm",
      "net_income_ttm",
      "ebitda_ttm",
      "total_assets_fq",
      "total_current_assets_fq",
      "cash_n_short_term_invest_fq",
      "total_liabilities_fq",
      "total_debt_fq",
      "net_debt_fq",
      "total_equity_fq",
      "current_ratio_fq",
      "quick_ratio_fq",
      "debt_to_equity_fq",
      "cash_n_short_term_invest_to_total_debt_fq",
      "cash_f_operating_activities_ttm",
      "cash_f_investing_activities_ttm",
      "cash_f_financing_activities_ttm",
      "free_cash_flow_ttm",
      "capital_expenditures_ttm",
      "Recommend.All",
      "Recommend.MA",
      "Recommend.Other",
      "RSI",
      "Mom",
      "AO",
      "CCI20",
      "Stoch.K",
      "Stoch.D",
      "MACD.macd",
      "MACD.signal",
      "Rec.Stoch.RSI",
      "Stoch.RSI.K",
      "Rec.WR",
      "W.R",
      "EMA10",
      "SMA10",
      "EMA20",
      "SMA20",
      "EMA30",
      "SMA30",
      "EMA50",
      "SMA50",
      "EMA100",
      "SMA100",
      "EMA200",
      "SMA200",
      "Rec.Ichimoku",
      "Ichimoku.BLine",
      "Rec.VWMA",
      "VWMA",
      "Rec.HullMA9",
      "HullMA9",
    ];

    const All = new Set([
      ...Overview,
      ...Valuation,
      ...Dividends,
      ...Profitability,
      ...IncomeStatement,
      ...BalanceSheet,
      ...CashFlow,
      ...Technical,
    ]);
    const request = await fetch(EndPoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        columns: AllRes,
        ignore_unknown_fields: false,
        options: {
          lang: "en",
        },
        range: [0, TotalStocks],
        sort: {
          sortBy: "name",
          sortOrder: "asc",
          nullsFirst: false,
        },
        preset: "all_stocks",
      }),
    });
    const final = [];
    const response = await request.json();

    for (let item of response.data) {
      const data: any = {};
      const symbol = item.d[0];
      for (let i = 0; i < item.d.length; i++) {
        data[AllRes[i].toLowerCase().replace(/\./g, "_")] = `${item.d[i]}`;
      }
      final.push(data);

      await prisma.marketData.upsert({
        where: {
          symbol_country: {
            symbol,
            country: "JP",
          },
        },
        create: {
          symbol,
          country: "JP",
          ...data,
        },
        update: {
          ...data,
        },
      });
      console.log("done", symbol);
    }

    console.log("Done");
    res.status(StatusCodes.OK).json({ success: true });
  } catch (error: any) {
    console.log(error);
    throw new BadRequestError(error.message || "Something went wrong!");
  }
};

const amarstockAllMarket = async (req: any, res: Response) => {
  try {
    const API_URL = "https://www.amarstock.com/LatestPrice/34267d8d73dd";
    const response = await fetch(API_URL);
    const data = await response.json();
    for (const item of data) {
      try {
        await prisma.market.upsert({
          where: {
            symbol: item.Scrip,
          },
          update: {
            changePer: `${item.ChangePer}`,
            ...(item.LTP != 0 && { ltp: `${item.LTP}` }),
            high: `${item.High}`,
            open: `${item.Open}`,
            low: `${item.Low}`,
            ...(item.Close != 0 && { close: `${item.Close}` }),
            change: `${item.Change}`,
            trade: `${item.Trade}`,
            value: `${item.Value}`,
            volume: `${item.Volume}`,
            fullName: `${item.FullName}`,
          },
          create: {
            symbol: item.Scrip,
            changePer: `${item.ChangePer}`,
            ltp: `${item.LTP}`,
            high: `${item.High}`,
            open: `${item.Open}`,
            low: `${item.Low}`,
            close: `${item.Close}`,
            change: `${item.Change}`,
            trade: `${item.Trade}`,
            value: `${item.Value}`,
            volume: `${item.Volume}`,
            fullName: `${item.FullName}`,
          },
        });
        console.log(`Upserted ${item.Scrip}`);
      } catch (error) {
        console.log(error);
      }
    }
    console.log("Done");
    const newData = await prisma.market.findMany({
      where: {
        country: "BD",
      },
    });
    await redisCache.set(
      `key::market::bd`,
      JSON.stringify(newData),
      "EX",
      60 * 60 * 24 * 30
    );
    res.status(StatusCodes.OK).json({ success: true });
  } catch (error: any) {
    console.log(error);
    throw new BadRequestError(error.message || "Something went wrong!");
  }
};

const dsebdIndex = async (req: any, res: Response) => {
  try {
    const html = await fetch("https://www.dsebd.org").then((res) => res.text());
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const allLinks = document.querySelectorAll("div.midrow");
    const resutls: any = [];
    for (let i = 0; i < 3; i++) {
      const link = allLinks[i];

      if (i == 0) {
        const dseXIndex = [
          link?.querySelector("div:nth-child(2)")?.textContent?.trim(),
          link?.querySelector("div:nth-child(3)")?.textContent?.trim(),
          link?.querySelector("div:nth-child(4)")?.textContent?.trim(),
        ];
        resutls.push({ dseXIndex });
      }
      if (i == 1) {
        const dseSIndex = [
          link?.querySelector("div:nth-child(2)")?.textContent?.trim(),
          link?.querySelector("div:nth-child(3)")?.textContent?.trim(),
          link?.querySelector("div:nth-child(4)")?.textContent?.trim(),
        ];
        resutls.push({ dseSIndex });
      }
      if (i == 2) {
        const ds30Index = [
          link?.querySelector("div:nth-child(2)")?.textContent?.trim(),
          link?.querySelector("div:nth-child(3)")?.textContent?.trim(),
          link?.querySelector("div:nth-child(4)")?.textContent?.trim(),
        ];
        resutls.push({ ds30Index });
      }
    }
    for (let i = 3; i < 7; i++) {
      const link = allLinks[i];
      if (i == 4) {
        const totalTrade = link
          ?.querySelector("div:nth-child(1)")
          ?.textContent?.trim();
        const totalVolume = link
          ?.querySelector("div:nth-child(2)")
          ?.textContent?.trim();
        const totalValue = link
          ?.querySelector("div:nth-child(3)")
          ?.textContent?.trim();
        resutls.push({
          totalTrade,
          totalVolume,
          totalValue,
        });
      }
      if (i == 6) {
        const issuesAdvanced = link
          ?.querySelector("div:nth-child(1)")
          ?.textContent?.trim();
        const issuesDeclined = link
          ?.querySelector("div:nth-child(2)")
          ?.textContent?.trim();
        const issuesUnchanged = link
          ?.querySelector("div:nth-child(3)")
          ?.textContent?.trim();
        resutls.push({
          issuesAdvanced,
          issuesDeclined,
          issuesUnchanged,
        });
      }
    }
    console.log(resutls);
    if (resutls?.length > 0) {
      await prisma.dsebdIndex.upsert({
        where: { country: "BD" },
        update: {
          dseXIndex: resutls[0].dseXIndex,
          dseSIndex: resutls[1].dseSIndex,
          ds30Index: resutls[2].ds30Index,
          totalTrade: resutls[3].totalTrade,
          totalVolume: resutls[3].totalVolume,
          totalValue: resutls[3].totalValue,
          issuesAdvanced: resutls[4].issuesAdvanced,
          issuesDeclined: resutls[4].issuesDeclined,
          issuesUnchanged: resutls[4].issuesUnchanged,
        },
        create: {
          country: "BD",
          dseXIndex: resutls[0].dseXIndex,
          dseSIndex: resutls[1].dseSIndex,
          ds30Index: resutls[2].ds30Index,
          totalTrade: resutls[3].totalTrade,
          totalVolume: resutls[3].totalVolume,
          totalValue: resutls[3].totalValue,
          issuesAdvanced: resutls[4].issuesAdvanced,
          issuesDeclined: resutls[4].issuesDeclined,
          issuesUnchanged: resutls[4].issuesUnchanged,
        },
      });
    }
    console.log("Done");

    res.status(StatusCodes.OK).json({ success: true });
  } catch (error) {
    console.log(error);
    throw new BadRequestError("Something went wrong!");
  }
};

const bdCategory = async (req: any, res: Response) => {
  try {
    const LINKS = [
      {
        category: "topGainer",
        url: "https://www.tradingview.com/markets/stocks-bangladesh/market-movers-gainers/",
        changePos: 2,
        pricePos: 3,
        volPos: 4,
      },
      {
        category: "biggestLosers",
        url: "https://www.tradingview.com/markets/stocks-bangladesh/market-movers-losers/",
        changePos: 2,
        pricePos: 3,
        volPos: 4,
      },
      {
        category: "mostActive",
        url: "https://www.tradingview.com/markets/stocks-bangladesh/market-movers-active/",
        changePos: 4,
        pricePos: 3,
        volPos: 5,
      },
      {
        category: "bestPerforming",
        url: "https://www.tradingview.com/markets/stocks-bangladesh/market-movers-best-performing/",
        changePos: 4,
        pricePos: 3,
        volPos: 5,
      },
    ];

    const livePrices = await prisma.market.findMany({
      where: { country: "BD" },
    });

    for (const l of LINKS) {
      const html = await fetch(l.url).then((r) => r.text());
      const dom = new JSDOM(html);
      const document = dom.window.document;
      const allLinks = document.querySelectorAll("tr.listRow");
      const resutls = [];
      for (let i = 0; i < allLinks.length; i++) {
        const link = allLinks[i];

        const symbolContainer = link.querySelector("td:nth-child(1) a");
        const symbol = symbolContainer
          ? symbolContainer?.textContent?.trim()
          : null;
        const data = livePrices.find((item) => item.symbol == symbol);
        if (data) {
          resutls.push(symbol);
        }
      }
      const promises = [];
      if (resutls.length > 0) {
        for (const item of livePrices) {
          const isTrue = resutls.includes(item.symbol);
          promises.push(
            prisma.market.update({
              where: { id: item.id },
              data: { [l.category]: isTrue ? true : false },
            })
          );
          console.log(l.category, isTrue);
        }
        await Promise.all(promises);
      }
    }
    console.log("Done");

    res.status(StatusCodes.OK).json({ success: true });
  } catch (error) {
    console.log(error);
    throw new BadRequestError("Something went wrong!");
  }
};

export {
  indexTvJp,
  presetTvJp,
  sectorTvJp,
  allStocksTvJp,
  amarstockAllMarket,
  dsebdIndex,
  bdCategory,
};
