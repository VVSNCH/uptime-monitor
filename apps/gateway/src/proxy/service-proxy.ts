import type { ServerResponse } from 'node:http'
import type { Socket } from 'node:net'

import { HttpStatus } from '@nestjs/common'
import type { ServiceResolver } from '@uptime/service-registry'
import { type ApiError, ERROR_CODES } from '@uptime/shared'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'

import { API_ROUTE_PREFIX, PROXY_TIMEOUT_MS } from '../constants/index.js'

export function createServiceProxy(resolver: ServiceResolver, service: string): RequestHandler[] {
  const targets = new WeakMap<Request, string>()

  const resolveTarget = (req: Request, res: Response, next: NextFunction) => {
    resolver.resolve(service).then((target) => {
      if (!target) {
        sendError(res, {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: ERROR_CODES.serviceUnavailable,
          message: `No ${service} instance is available`,
        })
        return
      }
      targets.set(req, target)
      next()
    }, next)
  }

  // req.url is left alone: the router re-matches each middleware layer against
  // it, so rewriting it here would stop the proxy layer from running at all.
  const proxy = createProxyMiddleware<Request, Response>({
    router: (req) => targets.get(req),
    pathRewrite: (_path, req) => req.originalUrl.slice(API_ROUTE_PREFIX.length) || '/',
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: PROXY_TIMEOUT_MS,
    on: {
      error: (_error, _req, res) => {
        if (isServerResponse(res) && !res.headersSent) {
          sendError(res, {
            statusCode: HttpStatus.BAD_GATEWAY,
            code: ERROR_CODES.upstreamUnreachable,
            message: `The ${service} service did not respond`,
          })
        }
      },
    },
  })

  return [resolveTarget, proxy]
}

function sendError(res: ServerResponse, body: ApiError) {
  res.writeHead(body.statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

function isServerResponse(res: ServerResponse | Socket): res is ServerResponse {
  return 'writeHead' in res
}
