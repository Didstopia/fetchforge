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

// Create a new API class
class API {
  constructor (username, pathOverride) {
    // Validate the username
    if (!username) {
      throw new Error('No username specified')
    }

    // Store the username
    this.username = username

    // Setup caching
    let cachePath = path.join(pathOverride || constants.DOWNLOAD_PATH, 'fetchforge', '.cache')
    log.verbose('Cache path:', cachePath)
    mkdirp(cachePath)
    let cache = new InMemoryCache()
    persistCache({
      cache: cache,
      storage: new AsyncNodeStorage(cachePath),
      maxSize: false,
      debug: constants.IS_DEBUG
    })

    // Create a new Apollo client
    this.client = new ApolloClient({
      link: new HttpLink({ uri: constants.FORGE_API_BASE, fetch: fetch }),
      cache: cache
    })

    // Create and start a spinner
    this.spinner = constants.Spinner
    this.spinner.start()

    // log.debug('New API() constructed for username:', username)
  }

  async loadVideos (cursor = '', index = 0, count = 24, limit = -1) {
    // log.debug('Loading videos with cursor, index, count and limit:', cursor, index, count, limit)

    // this.spinner.message(`Listing clips.. ${index}/${}`)

    return this.client.query({
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

        // Format the results
        let result = {
          videos: response.data.user._videos20YgKr.edges.map((item) => {
            return {
              id: item.node.id,
              title: item.node.title,
              game: {
                name: item.node.game.name,
                slug: item.node.game.slug
              },
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
          throw new Error(`No clips were found for user "${this.username}"`)
        }

        // Check if we need to process more results
        let resultsLimited = limit !== -1 && index + count >= limit
        if (response.data.user._videos20YgKr.pageInfo.hasNextPage && !resultsLimited) {
          // log.debug(`Loading more results.. (${result.total} clips total)`)

          // Load more results (recursively)
          let moreResults = await this.loadVideos(response.data.user._videos20YgKr.pageInfo.endCursor, index + count, count, limit)

          // Combine and store the results
          moreResults.videos = result.videos.concat(moreResults.videos)
          result = moreResults
        }

        this.spinner.stop()

        // Return the results
        return result
      })
      .catch(error => {
        // Bail out if GraphQL throws errors
        this.spinner.stop()
        log.debug('GraphQL query failed:', JSON.stringify(error))
        throw new Error(`An unknown error occurred (perhaps user "${this.username}" doesn't exist?)`)
      })
  }
}

// Export the class itself
module.exports = API
