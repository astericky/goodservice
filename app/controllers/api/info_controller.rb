class Api::InfoController < ApplicationController

  def index
    result = ScheduleProcessor.headway_info
    expires_now
    result[:blog_post] = blog_post if blog_post
    render json: result
  end

  private

  def blog_post
    return @blog_post if @blog_post
    begin
      feed = FeedProcessor.new
      @blog_post = {
        title: feed.latest.title,
        link: feed.latest.link,
      }
    rescue StandardError => e
      puts "Error retrieving feed: #{e.message}"
      puts e.backtrace
    end
  end
end