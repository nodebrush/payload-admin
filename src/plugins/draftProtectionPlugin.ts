import type { Config, Plugin } from 'payload'

/**
 * Payload plugin that restricts publishing for the MCP API user across all
 * collections and globals that have draft mode enabled.
 *
 * Uses a beforeOperation hook — the earliest possible interception point,
 * before field processing, access checks, or beforeChange hooks run.
 * Throws an error if mcp@nodebrush.com attempts to set _status: 'published'.
 *
 * Admin UI users with other emails are unaffected and can publish freely.
 */
export const draftProtectionPlugin = (): Plugin => (incomingConfig: Config): Config => {
    const hasDrafts = (versions: any): boolean => {
        if (!versions) return false
        if (typeof versions === 'object' && versions.drafts) return true
        return false
    }

    const blockMcpPublish = async ({ args, operation, req }: any) => {
        if (
            req.user?.email === 'mcp@nodebrush.com' &&
            (operation === 'update' || operation === 'create') &&
            args?.data?._status === 'published'
        ) {
            throw new Error('Publishing is not allowed for the MCP API user. Save as draft instead.')
        }
        return args
    }

    return {
        ...incomingConfig,
        collections: incomingConfig.collections?.map(collection => {
            if (!hasDrafts(collection.versions)) return collection
            return {
                ...collection,
                hooks: {
                    ...collection.hooks,
                    beforeOperation: [
                        blockMcpPublish,
                        ...(collection.hooks?.beforeOperation ?? []),
                    ],
                },
            }
        }),
        globals: incomingConfig.globals?.map(global => {
            if (!hasDrafts(global.versions)) return global
            return {
                ...global,
                hooks: {
                    ...global.hooks,
                    beforeOperation: [
                        blockMcpPublish,
                        ...(global.hooks?.beforeOperation ?? []),
                    ],
                },
            }
        }),
    }
}
