const constants = require('../utils/constants')
const log = require('../utils/log')
const path = require('path')
const ApolloClient = require('apollo-client-preset').ApolloClient
const HttpLink = require('apollo-link-http').HttpLink
const AsyncNodeStorage = require('redux-persist-node-storage').AsyncNodeStorage
const InMemoryCache = require('apollo-cache-inmemory').InMemoryCache
const persistCache = require('apollo-cache-persist').persistCache
const gql = require('graphql-tag')
const fetch = require('node-fetch')
const mkdirp = require('mkdir-recursive').mkdirSync
const promisify = require('util').promisify
const fs = require('fs')
const writeFile = promisify(fs.writeFile)

// Create a new API class
class API {
  constructor (username, pathOverride) {
    // Validate the username
    if (!username) {
      let err = new Error('No username specified')
      throw err
    }

    // Store the username
    this.username = username

    // Store the path override
    this.pathOverride = pathOverride
  }

  async configure () {
    return new Promise(async (resolve, reject) => {
      log.verbose('Configuring API client..')

      // Setup caching
      let cachePath = path.join(this.pathOverride || constants.DOWNLOAD_PATH, 'fetchforge', '.cache')
      log.verbose('Cache path:', cachePath)
      await mkdirp(cachePath)
      await writeFile(path.join(cachePath, 'apollo-cache-persist'), JSON.stringify({}), 'utf8')
      let cache = new InMemoryCache()
      await persistCache({
        cache: cache,
        storage: new AsyncNodeStorage(cachePath),
        maxSize: false/*,
        debug: constants.IS_DEBUG */
      })
        .catch(err => {
          return reject(err)
        })

      // Create a new Apollo client
      this.client = new ApolloClient({
        link: new HttpLink({ uri: constants.FORGE_API_BASE, fetch: fetch }),
        cache: cache
      })

      // Create and start a spinner
      this.spinner = constants.Spinner

      log.verbose('API client ready!')

      return resolve()
    })
  }

  async loadVideos (cursor = '', index = 0, count = 24, limit = -1) {
    return new Promise(async (resolve, reject) => {
      // log.debug('Loading videos with cursor, index, count and limit:', cursor, index, count, limit)

      if (!this['client']) {
        await this.configure()
      }

      if (!this.spinner.timer) {
        this.spinner.start()
      }

      await this.client.query({
        query: gql`
          query GetUserRecordings($username:String!, $first:Int!, $after: String) {
            user(username: $username) {
              id
              _videos20YgKr:videos(first: $first, after: $after) {
                pageInfo {
                  hasNextPage,
                  hasPreviousPage
                  startCursor
                  endCursor
                }
                edges {
                  node {
                    id
                    title
                    createdAt
                    thumbnail
                    mp4
                    game {
                      id
                      name
                      slug
                    }
                  }
                  cursor
                }
                totalCount
              }
              videoCount
            }
          }
        `,
        variables: {
          username: this.username,
          first: count,
          after: cursor
        }
      })
        .then(async response => {
          // log.debug('Response:', JSON.stringify(response, null, 2))

          if (!response.data.user) {
            let err = new Error(`Failed to list any clips. Possibly invalid username: "${this.username}"`)
            this.spinner.stop()
            throw err
          }

          // Format the results
          let result = {
            videos: response.data.user._videos20YgKr.edges.map((item) => {
              return {
                id: item.node.id,
                title: item.node.title,
                game: item.node['game'] ? {
                  name: item.node.game.name,
                  slug: item.node.game.slug
                } : { name: 'unknown', slug: 'unknown' },
                createdAt: item.node.createdAt,
                url: item.node.mp4,
                thumbnail: item.node.thumbnail.indexOf('http') !== -1 ? item.node.thumbnail : 'https:' + item.node.thumbnail
              }
            }),
            total: response.data.user._videos20YgKr.totalCount
          }

          this.spinner.message(`Listing clips.. ${parseInt((index + count) / result.total * 100)}% (${index + count}/${result.total})`)

          // Bail early if there are no videos
          if (!result.videos.length) {
            this.spinner.stop()
            let err = new Error(`No clips were found for user "${this.username}"`)
            this.spinner.stop()
            throw err
          }

          // Check if we need to process more results
          let resultsLimited = limit !== -1 && index + count >= limit
          if (response.data.user._videos20YgKr.pageInfo.hasNextPage && !resultsLimited) {
            // log.debug(`Loading more results.. (${result.total} clips total)`)

            // Load more results (recursively)
            let moreResults = await this.loadVideos(response.data.user._videos20YgKr.pageInfo.endCursor, index + count, count, limit)
              .catch(err => {
                throw err
              })

            // Combine and store the results
            moreResults.videos = result.videos.concat(moreResults.videos)
            result = moreResults
          }

          this.spinner.stop()

          // Return the results
          return resolve(result)
        })
        .catch(error => {
          // Bail out if GraphQL throws errors
          this.spinner.stop()
          log.debug('GraphQL query failed:', error)
          return reject(error)
        })
    })
  }
}

// Export the class itself
module.exports = API
