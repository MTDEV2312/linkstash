// DTOs para serialización de datos
// cada DTO define el formato de respuesta sin datos sensibles

// ==================== USER DTOs ====================
export class UserDTO {
  constructor(user) {
    this.id = user._id;
    this.username = user.username;
    this.email = user.email;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }

  static fromUser(user) {
    return new UserDTO(user);
  }

  static toJSON() {
    const dto = this;
    return {
      id: dto.id,
      username: dto.username,
      email: dto.email,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt
    };
  }
}

export class AuthResponseDTO {
  constructor(token, user) {
    this.token = token;
    this.user = new UserDTO(user);
    this.expiresIn = '7d';
  }

  toJSON() {
    return {
      token: this.token,
      user: this.user.toJSON?.() ?? this.user,
      expiresIn: this.expiresIn
    };
  }
}

// ==================== LINK DTOs ====================
export class LinkDTO {
  constructor(link) {
    this.id = link._id;
    this.url = link.url;
    this.title = link.title;
    this.description = link.description;
    this.image = link.image;
    this.tags = link.tags;
    this.isFavorite = link.isFavorite;
    this.isArchived = link.isArchived;
    this.clickCount = link.clickCount;
    this.lastVisited = link.lastVisited;
    this.status = link.status;
    this.createdAt = link.createdAt;
    this.updatedAt = link.updatedAt;
  }

  static fromLink(link) {
    return new LinkDTO(link);
  }

  static fromLinks(links) {
    return links.map(link => new LinkDTO(link));
  }

  toJSON() {
    return {
      id: this.id,
      url: this.url,
      title: this.title,
      description: this.description,
      image: this.image,
      tags: this.tags,
      isFavorite: this.isFavorite,
      isArchived: this.isArchived,
      clickCount: this.clickCount,
      lastVisited: this.lastVisited,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export class LinkPaginatedDTO {
  constructor(links, pagination) {
    this.links = LinkDTO.fromLinks(links);
    this.pagination = pagination;
  }

  toJSON() {
    return {
      links: this.links.map(link => link.toJSON?.() ?? link),
      pagination: this.pagination
    };
  }
}

// ==================== TAG DTOs ====================
export class TagDTO {
  constructor(tag) {
    this.id = tag._id;
    this.name = tag.name;
    this.color = tag.color;
    this.description = tag.description;
    this.linkCount = tag.linkCount;
    this.createdAt = tag.createdAt;
    this.updatedAt = tag.updatedAt;
  }

  static fromTag(tag) {
    return new TagDTO(tag);
  }

  static fromTags(tags) {
    return tags.map(tag => new TagDTO(tag));
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      description: this.description,
      linkCount: this.linkCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// ==================== RESPONSE DTOs ====================
export class PaginationDTO {
  constructor(page, limit, total) {
    this.currentPage = page;
    this.totalPages = Math.ceil(total / limit);
    this.totalItems = total;
    this.itemsPerPage = limit;
    this.hasNextPage = page < this.totalPages;
    this.hasPrevPage = page > 1;
  }

  toJSON() {
    return {
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      totalItems: this.totalItems,
      itemsPerPage: this.itemsPerPage,
      hasNextPage: this.hasNextPage,
      hasPrevPage: this.hasPrevPage
    };
  }
}

// Response wrapper
export class ApiResponseDTO {
  constructor(success, message, data = null, errorCode = null, errors = null) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.errorCode = errorCode;
    this.errors = errors;
  }

  static success(message, data = null) {
    return new ApiResponseDTO(true, message, data);
  }

  static error(message, errorCode = null, errors = null) {
    return new ApiResponseDTO(false, message, null, errorCode, errors);
  }

  toJSON() {
    const response = {
      success: this.success,
      message: this.message
    };

    if (this.data !== null) {
      response.data = this.data;
    }

    if (this.errorCode) {
      response.errorCode = this.errorCode;
    }

    if (this.errors) {
      response.errors = this.errors;
    }

    return response;
  }
}

// Dashboard DTO
export class DashboardStatsDTO {
  constructor(stats) {
    this.totalLinks = stats.totalLinks || 0;
    this.archivedLinks = stats.archivedLinks || 0;
    this.favoriteLinks = stats.favoriteLinks || 0;
    this.totalTags = stats.totalTags || 0;
    this.topTags = stats.topTags || [];
    this.topLinks = stats.topLinks || [];
    this.recentLinks = stats.recentLinks || [];
  }

  toJSON() {
    return {
      totalLinks: this.totalLinks,
      archivedLinks: this.archivedLinks,
      favoriteLinks: this.favoriteLinks,
      totalTags: this.totalTags,
      topTags: this.topTags,
      topLinks: this.topLinks,
      recentLinks: this.recentLinks
    };
  }
}
