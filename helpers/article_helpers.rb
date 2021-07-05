module ArticleHelpers
  def title(article)
    article.data.priority_title || article.title
  end

  def other_articles(current_article, tag:)
    articles = blog.articles
      .select { |article| article.tags.include? tag }
      .reject { |article| article.title == current_article.title }
  end

  def article_link(article)
    link_to title(article), article.url
  end
end