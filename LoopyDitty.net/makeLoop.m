X = [0 0 0 0];

for ii = 1:200
    clf;
    plot(X(:, 1), X(:, 2), '.');
    xlim([0, 12]);
    ylim([0, 1]);
    axis equal;
    [x, y] = ginput(1);
    X = [X; [x y 0 ii]];
end

for ii = 1:size(X, 1)
   fprintf(1, '[');
   for jj = 1:size(X, 2)
      fprintf(1, '%g', X(ii, jj));
      if jj < size(X, 2)
          fprintf(1, ',');
      end
   end
   fprintf(1, '],');
end

C = colormap('jet');
C = C';
C = C(:);
for ii = 1:length(C)
    fprintf(1, '%g, ', C(ii));
end