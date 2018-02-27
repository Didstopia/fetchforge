const constants = require('../utils/constants')
// const log = require('../utils/log')

const r2 = require('r2')

class API {
  constructor (userId) {
    // Validate the userId
    if (!userId) {
      throw new Error('No userId specified')
    }

    // Store the userId
    this.userId = userId

    // log.debug('New API() constructed for userId:', userId)
  }

  // TODO: We might want to go for 24 clips a a time, since that's the default for forge.gg
  async loadVideos (afterId = '', index = 0, count = 1) {
    // log.debug('Loading videos after id, at index and with count:', afterId, index, count)

    // Create the request body
    let requestBody = {
      query: `query ProfileMainV5_UserRelayQL($id_0:ID!) {node(id:$id_0) {...F9}} fragment F0 on Video {id,createdAt,author {id,username,avatar},game {slug,name,id}} fragment F1 on Video {id,mp4,thumbnail,...F0} fragment F2 on Video {id,createdAt,mp4,title,game {name,id},...F1} fragment F3 on Video {id,title,game {name,id},likeCount,commentCount,...F2} fragment F4 on VideoConnection {pageInfo {hasNextPage,hasPreviousPage},edges {score,node {id,...F3},cursor}} fragment F5 on User {id,viewerDoesFollow,followerCount} fragment F6 on User {id,username,avatar,cover,coverScreenshot,bio,isViewer,viewerDoesFollow,_storyVideos3sYjet:storyVideos(first:1,afterDate:"2018-02-24 08:53:66") {totalCount},...F5} fragment F7 on Video {id,title,thumbnail,commentCount,likeCount,createdAt,author {username,id,...F6},game {name,id}} fragment F8 on VideoConnection {pageInfo {hasNextPage,hasPreviousPage},edges {node {id,...F7},cursor}} fragment F9 on User {id,_videos20YgKr:videos(first:${count},after:"${afterId}") {...F4,...F8}}`,
      variables: {
        id_0: Buffer.from(`User:${this.userId}`).toString('base64')
      }
    }

    // log.debug('requestBody:', JSON.stringify(requestBody, null, 2))

    // Execute the async request
    let response = await r2.post(constants.FORGE_API_BASE, { json: requestBody }).response
    // log.debug('Response:', JSON.stringify(response, null, 2))
    let json = await response.json()
    // log.debug('JSON:', JSON.stringify(json, null, 2))

    let result = {
      afterId: afterId,
      lastId: json.data.node._videos20YgKr.edges[json.data.node._videos20YgKr.edges.length - 1].cursor,
      hasMore: json.data.node._videos20YgKr.pageInfo.hasNextPage,
      hasLess: json.data.node._videos20YgKr.pageInfo.hasPreviousPage,
      videos: json.data.node._videos20YgKr.edges.map((item) => {
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
      })
    }

    // FIXME: Remove this hardcoded, debug specific limit
    if (result.hasMore && index < count) {
      // log.debug('More videos available, loading..')
      let moreResults = await this.loadVideos(result.lastId, index + count, count)
      moreResults.videos = result.videos.concat(moreResults.videos)
      result = moreResults
    }

    // log.debug('Result:', JSON.stringify(result, null, 2))
    // log.debug('Total video count:', result.videos.length)
    return result
  }
}

module.exports = API
