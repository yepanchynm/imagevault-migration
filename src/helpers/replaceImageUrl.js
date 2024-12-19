export function replaceImageVaultWithStoryblok(data, storyblokImage) {
    function replaceUrls(content) {
        if (Array.isArray(content)) {
            return content.map(replaceUrls);
        }

        if (typeof content === "object" && content !== null) {
            const updatedContent = { ...content };

            if (updatedContent.plugin === "image-vault") {
                updatedContent.item = {
                    ...updatedContent.item,
                    MediaConversions: updatedContent.item.MediaConversions.map((media) => ({
                        ...media,
                        Url: storyblokImage.baseUrl,
                    })),
                };
            }

            if (updatedContent.Html) {
                updatedContent.Html = updatedContent.Html.replace(
                    /https:\/\/tobii\.imagevault\.app\/[^\s"]+/g,
                    storyblokImage.baseUrl
                );
            }

            for (const key in updatedContent) {
                updatedContent[key] = replaceUrls(updatedContent[key]);
            }

            return updatedContent;
        }

        return content;
    }

    const updatedContent = {
        content: replaceUrls(data.content),
    };

    return {
        ...data,
        content: updatedContent,
    };
}