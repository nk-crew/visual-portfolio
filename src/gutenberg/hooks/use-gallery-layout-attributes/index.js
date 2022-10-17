import md5 from 'md5';

import useVpfGalleryAttributes from '../use-gallery-attributes';

const { useEffect, useRef, useState } = wp.element;

export default function useVpfGalleryLayoutAttributes(galleryId) {
  const findingAttributes = useVpfGalleryAttributes(galleryId);
  const postId = wp.data.select('core/editor').getCurrentPostId();
  const hash = md5(postId + JSON.stringify(findingAttributes));
  const url = '/visual-portfolio/v1/get_layout_attributes/';

  const cache = useRef({});
  const [status, setStatus] = useState('idle');
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!url) return;
    const fetchData = async () => {
      setStatus('fetching');
      if (cache.current[hash]) {
        const cacheData = cache.current[hash];
        setData(cacheData);
        setStatus('fetched');
      } else {
        const response = await wp.apiFetch({
          path: url,
          method: 'POST',
          data: {
            data: findingAttributes,
            post_id: postId,
          },
        });
        if (await response.success) {
          const fetchedData = await response.response;
          cache.current[hash] = fetchedData; // set response in cache;
          setData(fetchedData);
        }
        setStatus('fetched');
      }
    };

    fetchData();
  }, [url, data, postId, findingAttributes, hash]);

  return { status, data };
}
