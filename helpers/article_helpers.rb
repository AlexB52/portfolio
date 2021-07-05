module ArticleHelpers
  def title(article)
    article.data.priority_title || article.title
  end

  def article_link(article)
    link_to title(article), article.url
  end
end