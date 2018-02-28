const constants = require('../utils/constants')
const log = require('../utils/log')

const os = require('os')

const ApolloClient = require('apollo-client-preset').ApolloClient
const HttpLink = require('apollo-link-http').HttpLink
const AsyncNodeStorage = require('redux-persist-node-storage').AsyncNodeStorage
const InMemoryCache = require('apollo-cache-inmemory').InMemoryCache
const persistCache = require('apollo-cache-persist').persistCache
const gql = require('graphql-tag')

const CLI = require('clui')
// const CLC = require('cli-color')
// const Line = CLI.Line
// const Progress = CLI.Progress
const Spinner = CLI.Spinner

class API {
  constructor (username) {
    // Validate the username
    if (!username) {
      throw new Error('No username specified')
    }

    // Store the username
    this.username = username

    // Setup caching
    let cache = new InMemoryCache()
    persistCache({
      cache: cache,
      storage: new AsyncNodeStorage(constants.IS_DEBUG ? './tmp' : os.tmpdir()),
      maxSize: false
    })

    // Create a new Apollo client
    this.client = new ApolloClient({
      link: new HttpLink({ uri: constants.FORGE_API_BASE }),
      cache: cache
    })

    // Create and start a spinner
    this.spinner = new Spinner('Listing clips..', ['◜', '◝', '◞', '◟'])
    this.spinner.start()

    // log.debug('New API() constructed for username:', username)
  }

  // TODO: Use the "totalCount" or "videoCount" properties to calculate progress percentages etc.
  // TODO: We might want to go for 24 clips a a time, since that's the default for forge.gg
  async loadVideos (cursor = '', index = 0, count = 1) {
    log.debug('Loading videos with cursor, index and count:', cursor, index, count)

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

        this.spinner.message(`Listing clips.. ${index}/${result.total}`)

        // Bail early if there are no videos
        if (!result.videos.length) {
          log.error(`Error: No clips were found for user "${this.username}"`)
          process.exit(1)
        }

        // Check if we need to process more results
        if (response.data.user._videos20YgKr.pageInfo.hasNextPage && index < 4) { // FIXME: Remove the index check, it's for debugging only!
          log.debug(`Loading more results.. (${result.total} clips total)`)

          // Load more results (recursively)
          let moreResults = await this.loadVideos(response.data.user._videos20YgKr.pageInfo.endCursor, index + count, count)

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
        log.debug('GraphQL query failed:', JSON.stringify(error))
        log.error(`Error: An unknown error occurred (perhaps user "${this.username}" doesn't exist?)`)
        process.exit(1)
      })
  }
}

module.exports = API
